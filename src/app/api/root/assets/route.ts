import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { resolveScopedTenantId } from "@/server/root/target-tenant";
import { getTenantContext } from "@/server/tenant/context";

const querySchema = z.object({
  tenantId: z.string().cuid().optional(),
  type: z
    .enum(["CONTRACT", "VOUCHER", "BROCHURE", "PLAN", "TOUR_MEDIA", "OTHER"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext();
    requireRole(ctx, ["ROOT", "ADMIN"]);
    const url = new URL(request.url);
    const payload = querySchema.parse({
      tenantId: url.searchParams.get("tenantId") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    const scoped = await resolveScopedTenantId({
      role: ctx.role,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    });
    const targetTenantId =
      payload.tenantId && ctx.role !== "ROOT" ? payload.tenantId : scoped.targetTenantId;

    const assets = await prisma.asset.findMany({
      where: {
        tenantId: targetTenantId,
        type: payload.type,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: payload.limit ?? 30,
    });

    return NextResponse.json({ ok: true, assets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list assets";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
