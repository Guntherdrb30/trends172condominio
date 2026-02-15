import crypto from "node:crypto";
import { z } from "zod";

import { prisma } from "@/server/db";
import type { DalContext } from "@/server/dal/context";
import { assertTenantContext } from "@/server/dal/context";
import { writeAuditLog } from "@/server/dal/audit-log";

const createAssetSchema = z.object({
  type: z.enum(["CONTRACT", "VOUCHER", "BROCHURE", "PLAN", "TOUR_MEDIA", "OTHER"]),
  name: z.string().min(1),
  blobPath: z.string().min(1),
  blobUrl: z.string().url().optional(),
  contentType: z.string().optional(),
  bytes: z.number().int().positive().optional(),
  saleId: z.string().cuid().optional(),
  reservationId: z.string().cuid().optional(),
  paymentId: z.string().cuid().optional(),
  typologyId: z.string().cuid().optional(),
  amenityInstanceId: z.string().cuid().optional(),
  unitId: z.string().cuid().optional(),
});

function signAssetPayload(payload: string) {
  const secret = process.env.ROOT_MASTER_KEY ?? process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("ROOT_MASTER_KEY or AUTH_SECRET must be configured in production.");
  }
  return crypto.createHmac("sha256", secret ?? "dev_blob_secret").update(payload).digest("base64url");
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export async function createAsset(ctx: DalContext, input: z.input<typeof createAssetSchema>) {
  assertTenantContext(ctx);
  const payload = createAssetSchema.parse(input);
  const [sale, reservation, payment, typology, amenityInstance, unit] = await Promise.all([
    payload.saleId
      ? prisma.sale.findFirst({
          where: {
            id: payload.saleId,
            tenantId: ctx.tenantId,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    payload.reservationId
      ? prisma.reservation.findFirst({
          where: {
            id: payload.reservationId,
            tenantId: ctx.tenantId,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    payload.paymentId
      ? prisma.payment.findFirst({
          where: {
            id: payload.paymentId,
            tenantId: ctx.tenantId,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    payload.typologyId
      ? prisma.typology.findFirst({
          where: {
            id: payload.typologyId,
            tenantId: ctx.tenantId,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    payload.amenityInstanceId
      ? prisma.amenityInstance.findFirst({
          where: {
            id: payload.amenityInstanceId,
            tenantId: ctx.tenantId,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    payload.unitId
      ? prisma.unit.findFirst({
          where: {
            id: payload.unitId,
            tenantId: ctx.tenantId,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (payload.saleId && !sale) throw new Error("Sale not found for tenant.");
  if (payload.reservationId && !reservation) throw new Error("Reservation not found for tenant.");
  if (payload.paymentId && !payment) throw new Error("Payment not found for tenant.");
  if (payload.typologyId && !typology) throw new Error("Typology not found for tenant.");
  if (payload.amenityInstanceId && !amenityInstance) throw new Error("Amenity instance not found for tenant.");
  if (payload.unitId && !unit) throw new Error("Unit not found for tenant.");

  const asset = await prisma.asset.create({
    data: {
      tenantId: ctx.tenantId,
      uploadedById: ctx.userId,
      type: payload.type,
      name: payload.name,
      blobPath: payload.blobPath,
      blobUrl: payload.blobUrl,
      contentType: payload.contentType,
      bytes: payload.bytes,
      saleId: payload.saleId,
      reservationId: payload.reservationId,
      paymentId: payload.paymentId,
      typologyId: payload.typologyId,
      amenityInstanceId: payload.amenityInstanceId,
      unitId: payload.unitId,
    },
  });

  await writeAuditLog(ctx, {
    action: "asset.created",
    entityType: "Asset",
    entityId: asset.id,
    metadata: {
      type: asset.type,
      blobPath: asset.blobPath,
    },
  });

  return asset;
}

async function assertAssetReadableByUser(ctx: DalContext, assetId: string) {
  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      tenantId: ctx.tenantId,
    },
    include: {
      reservation: true,
      sale: true,
    },
  });

  if (!asset) {
    throw new Error("Asset not found.");
  }

  if (!ctx.userId) {
    throw new Error("Authentication required for asset access.");
  }

  if (ctx.role === "ROOT" || ctx.role === "ADMIN" || ctx.role === "SELLER") {
    return asset;
  }

  const allowedByReservation = asset.reservation?.userId === ctx.userId;
  const allowedBySale = asset.sale?.buyerId === ctx.userId;
  if (!allowedByReservation && !allowedBySale) {
    throw new Error("Access denied for this asset.");
  }

  return asset;
}

export async function generateSignedAssetUrl(ctx: DalContext, assetId: string, ttlSeconds = 120) {
  assertTenantContext(ctx);
  const asset = await assertAssetReadableByUser(ctx, assetId);
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payloadRaw = JSON.stringify({
    assetId,
    tenantId: ctx.tenantId,
    exp,
  });
  const payload = base64UrlEncode(payloadRaw);
  const signature = signAssetPayload(payload);
  const token = `${payload}.${signature}`;

  await writeAuditLog(ctx, {
    action: "asset.signed_url.generated",
    entityType: "Asset",
    entityId: asset.id,
    metadata: { ttlSeconds },
  });

  return {
    assetId: asset.id,
    signedUrl: `/api/blob/access?token=${encodeURIComponent(token)}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export function verifyAssetToken(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = signAssetPayload(payload);
  if (!safeEqual(expected, signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as {
      assetId: string;
      tenantId: string;
      exp: number;
    };
    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
