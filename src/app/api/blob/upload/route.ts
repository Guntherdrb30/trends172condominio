import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { createAsset } from "@/server/services/assets.service";
import { getTenantContext } from "@/server/tenant/context";

const uploadMetaSchema = z.object({
  type: z.enum(["CONTRACT", "VOUCHER", "BROCHURE", "PLAN", "TOUR_MEDIA", "OTHER"]),
  saleId: z.string().cuid().optional(),
  reservationId: z.string().cuid().optional(),
  paymentId: z.string().cuid().optional(),
  typologyId: z.string().cuid().optional(),
  amenityInstanceId: z.string().cuid().optional(),
  unitId: z.string().cuid().optional(),
});

export async function POST(request: Request) {
  try {
    const tenantCtx = await requireTenantMembership(await getTenantContext(), ["ADMIN", "ROOT", "SELLER"]);
    const formData = await request.formData();
    const file = formData.get("file");
    const rawMeta = formData.get("meta");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file field is required" }, { status: 400 });
    }

    const meta =
      typeof rawMeta === "string" ? uploadMetaSchema.parse(JSON.parse(rawMeta)) : uploadMetaSchema.parse({ type: "OTHER" });
    const safeName = file.name.replace(/[^\w.-]/g, "_");
    const pathname = `${tenantCtx.tenantId}/${Date.now()}-${safeName}`;

    let blobUrl: string | undefined;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(pathname, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      blobUrl = blob.url;
    }

    const asset = await createAsset(createDalContext(tenantCtx), {
      ...meta,
      name: file.name,
      blobPath: pathname,
      blobUrl,
      contentType: file.type,
      bytes: file.size,
    });

    return NextResponse.json({
      ok: true,
      assetId: asset.id,
      blobPath: asset.blobPath,
      blobUrl: asset.blobUrl,
      hasBlobUpload: Boolean(blobUrl),
      warning: blobUrl
        ? undefined
        : "Archivo registrado sin subir a Blob. Configura BLOB_READ_WRITE_TOKEN para obtener URL publica.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
