import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformRoot } from "@/server/auth/guards";
import { writeAuditLog } from "@/server/dal/audit-log";
import { createDalContext } from "@/server/dal/context";
import {
  getRootCustomerTenants,
  getRootTargetTenant,
  setRootTargetTenant,
} from "@/server/root/target-tenant";
import { getTenantContext } from "@/server/tenant/context";

const setTargetSchema = z.object({
  tenantId: z.string().cuid(),
});

export async function GET() {
  try {
    const ctx = await requirePlatformRoot(await getTenantContext());
    const [targets, selected] = await Promise.all([
      getRootCustomerTenants(),
      getRootTargetTenant(ctx.userId),
    ]);

    return NextResponse.json({
      ok: true,
      platformTenantId: selected.platformTenantId,
      targetTenantId: selected.targetTenantId,
      tenants: targets,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load target tenant";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requirePlatformRoot(await getTenantContext());
    const payload = setTargetSchema.parse(await request.json());

    await setRootTargetTenant(ctx.userId, payload.tenantId);
    await writeAuditLog(createDalContext(ctx), {
      action: "root.target_tenant.updated",
      entityType: "Tenant",
      entityId: payload.tenantId,
    });

    return NextResponse.json({ ok: true, targetTenantId: payload.tenantId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update target tenant";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

