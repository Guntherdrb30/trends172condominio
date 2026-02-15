import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import { createDalContext } from "@/server/dal/context";
import { resolveScopedTenantId } from "@/server/root/target-tenant";
import { getTenantContext } from "@/server/tenant/context";

const querySchema = z.object({
  tenantId: z.string().cuid().optional(),
});

const createProductSchema = z.object({
  tenantId: z.string().cuid().optional(),
  name: z.string().min(2).max(180),
  slug: z.string().min(2).max(180).optional(),
  description: z.string().max(2000).optional(),
  areaM2: z.coerce.number().positive().optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  parkingSpots: z.coerce.number().int().min(0).optional(),
  basePrice: z.coerce.number().positive().optional(),
  imageUrls: z.array(z.string().url()).max(10).optional(),
  tourVideoUrls: z.array(z.string().url()).max(2).optional(),
  planPdfUrls: z.array(z.string().url()).max(5).optional(),
});

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext();
    requireRole(ctx, ["ROOT", "ADMIN"]);
    const url = new URL(request.url);
    const { tenantId } = querySchema.parse({
      tenantId: url.searchParams.get("tenantId") ?? undefined,
    });
    const scoped = await resolveScopedTenantId({
      role: ctx.role,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    });
    const targetTenantId = tenantId && ctx.role !== "ROOT" ? tenantId : scoped.targetTenantId;

    const products = await prisma.typology.findMany({
      where: {
        tenantId: targetTenantId,
      },
      include: {
        media: true,
        _count: {
          select: {
            units: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ ok: true, products });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list products";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext();
    requireRole(ctx, ["ROOT", "ADMIN"]);
    const payload = createProductSchema.parse(await request.json());
    const scoped = await resolveScopedTenantId({
      role: ctx.role,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    });
    const targetTenantId =
      payload.tenantId && ctx.role !== "ROOT" ? payload.tenantId : scoped.targetTenantId;

    const baseSlug = payload.slug ? toSlug(payload.slug) : toSlug(payload.name);
    const safeSlug = baseSlug || `product-${Date.now()}`;
    const existingCount = await prisma.typology.count({
      where: {
        tenantId: targetTenantId,
        slug: {
          startsWith: safeSlug,
        },
      },
    });
    const slug = existingCount > 0 ? `${safeSlug}-${existingCount + 1}` : safeSlug;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.typology.create({
        data: {
          tenantId: targetTenantId,
          name: payload.name,
          slug,
          description: payload.description,
          areaM2: payload.areaM2,
          bedrooms: payload.bedrooms,
          bathrooms: payload.bathrooms,
          parkingSpots: payload.parkingSpots,
          basePrice: payload.basePrice,
          isPublished: true,
        },
      });

      const mediaData = [
        ...(payload.imageUrls ?? []).map((url, index) => ({
          tenantId: targetTenantId,
          typologyId: created.id,
          kind: "image",
          title: `Image ${index + 1}`,
          url,
          sortOrder: index,
        })),
        ...(payload.tourVideoUrls ?? []).map((url, index) => ({
          tenantId: targetTenantId,
          typologyId: created.id,
          kind: "video",
          title: `Tour Video ${index + 1}`,
          url,
          sortOrder: index,
        })),
        ...(payload.planPdfUrls ?? []).map((url, index) => ({
          tenantId: targetTenantId,
          typologyId: created.id,
          kind: "plan_pdf",
          title: `Plan PDF ${index + 1}`,
          url,
          sortOrder: index,
        })),
      ];

      if (mediaData.length > 0) {
        await tx.typologyMedia.createMany({
          data: mediaData,
        });
      }

      return created;
    });

    await writeAuditLog(createDalContext(ctx), {
      action: "root.product.created",
      entityType: "Typology",
      entityId: product.id,
      metadata: {
        tenantId: targetTenantId,
        slug,
      },
    });

    return NextResponse.json({ ok: true, product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create product";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
