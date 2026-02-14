import { NextResponse } from "next/server";

import { getAuthSession } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import { verifyAssetToken } from "@/server/services/assets.service";
import { getTenantContext } from "@/server/tenant/context";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const parsed = verifyAssetToken(token);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const tenantCtx = await getTenantContext();
  if (!tenantCtx || tenantCtx.tenantId !== parsed.tenantId) {
    return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 });
  }

  const asset = await prisma.asset.findFirst({
    where: {
      id: parsed.assetId,
      tenantId: parsed.tenantId,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const session = await getAuthSession();
  await writeAuditLog(
    {
      tenantId: parsed.tenantId,
      userId: session?.user.id,
      role: session?.user.role,
      privileged: false,
    },
    {
      action: "asset.accessed.via_signed_url",
      entityType: "Asset",
      entityId: asset.id,
      metadata: {
        blobPath: asset.blobPath,
      },
    },
  );

  if (asset.blobUrl) {
    const upstream = await fetch(asset.blobUrl);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Blob fetch failed" }, { status: 502 });
    }

    const responseHeaders = new Headers();
    responseHeaders.set(
      "Content-Type",
      upstream.headers.get("content-type") ?? asset.contentType ?? "application/octet-stream",
    );
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }
    responseHeaders.set("Content-Disposition", `inline; filename="${asset.name}"`);
    responseHeaders.set("Cache-Control", "private, no-store, max-age=0");

    return new NextResponse(upstream.body, {
      status: 200,
      headers: responseHeaders,
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Asset exists but has no external blob URL in this environment",
    assetId: asset.id,
    name: asset.name,
  });
}
