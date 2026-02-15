import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { resolveScopedTenantId } from "@/server/root/target-tenant";
import { getTenantReportsSummary } from "@/server/services/reports.service";
import { getTenantContext } from "@/server/tenant/context";

const querySchema = z.object({
  tenantId: z.string().cuid().optional(),
});

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext();
    requireRole(ctx, ["ROOT", "ADMIN"]);
    const url = new URL(request.url);
    const payload = querySchema.parse({
      tenantId: url.searchParams.get("tenantId") ?? undefined,
    });

    const scoped = await resolveScopedTenantId({
      role: ctx.role,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    });

    const summary = await getTenantReportsSummary(createDalContext(ctx), {
      tenantId: ctx.role === "ROOT" && payload.tenantId ? payload.tenantId : scoped.targetTenantId,
    });
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load reports";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
