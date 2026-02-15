import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformRoot } from "@/server/auth/guards";
import { writeAuditLog } from "@/server/dal/audit-log";
import { createDalContext } from "@/server/dal/context";
import { prisma } from "@/server/db";
import { getTenantContext } from "@/server/tenant/context";

const bodySchema = z.object({
  entityType: z.enum(["TYPOLOGY", "AMENITY"]),
  entityId: z.string().cuid(),
  title: z.string().max(140).optional(),
});

function safeFilename(filename: string) {
  return filename.replace(/[^\w.-]/g, "_");
}

export async function POST(request: Request) {
  try {
    const rootCtx = await requirePlatformRoot(await getTenantContext());
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN no esta configurado en Vercel." },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const rawMeta = formData.get("meta");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file es obligatorio." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se permiten imagenes." }, { status: 400 });
    }

    const meta = bodySchema.parse(
      typeof rawMeta === "string" ? JSON.parse(rawMeta) : {},
    );

    const safeName = safeFilename(file.name);
    const pathname = `marketplace/${meta.entityType.toLowerCase()}/${meta.entityId}/${Date.now()}-${safeName}`;
    const blob = await put(pathname, file, {
      access: "public",
      token,
    });

    if (meta.entityType === "TYPOLOGY") {
      const typology = await prisma.typology.findUnique({
        where: { id: meta.entityId },
        select: { id: true, tenantId: true },
      });
      if (!typology) {
        return NextResponse.json({ error: "Tipologia no encontrada." }, { status: 404 });
      }

      await prisma.typologyMedia.create({
        data: {
          tenantId: typology.tenantId,
          typologyId: meta.entityId,
          kind: "image",
          title: meta.title,
          url: blob.url,
          sortOrder: -1,
        },
      });
    } else {
      const amenity = await prisma.amenityInstance.findUnique({
        where: { id: meta.entityId },
        select: { id: true, tenantId: true },
      });
      if (!amenity) {
        return NextResponse.json({ error: "Amenidad no encontrada." }, { status: 404 });
      }

      await prisma.amenityMedia.create({
        data: {
          tenantId: amenity.tenantId,
          amenityId: meta.entityId,
          title: meta.title,
          url: blob.url,
          mediaType: "image",
          sortOrder: -1,
        },
      });
    }

    await writeAuditLog(createDalContext(rootCtx), {
      action: "root.marketplace.media.uploaded",
      entityType: meta.entityType,
      entityId: meta.entityId,
      metadata: {
        url: blob.url,
        contentType: file.type,
        bytes: file.size,
      },
    });

    return NextResponse.json({
      ok: true,
      url: blob.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo subir imagen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
