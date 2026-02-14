import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePrivilegedMode, requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import { createDalContext } from "@/server/dal/context";
import { getTenantContext } from "@/server/tenant/context";

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  heroTitle: z.string().max(200).optional(),
  heroSubtitle: z.string().max(400).optional(),
  whatsappNumber: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  sellerCommissionPct: z.coerce.number().min(0).max(30).optional(),
  platformFeePct: z.coerce.number().min(0).max(10).optional(),
  reservationTtlHours: z.coerce.number().int().min(1).max(168).optional(),
  payrollEnabled: z.boolean().optional(),
});

type RouteParams = {
  params: Promise<{ tenantId: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const ctx = await getTenantContext();
    requireRole(ctx, ["ROOT", "ADMIN"]);
    requirePrivilegedMode(ctx);

    const { tenantId } = await params;
    const payload = updateTenantSchema.parse(await request.json());
    const tenant = await prisma.tenant.update({
      where: {
        id: tenantId,
      },
      data: payload,
    });

    await writeAuditLog(createDalContext(ctx), {
      action: "root.tenant.updated",
      entityType: "Tenant",
      entityId: tenant.id,
      metadata: payload,
    });

    return NextResponse.json({ ok: true, tenant });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update tenant";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const ctx = await getTenantContext();
    requireRole(ctx, ["ROOT", "ADMIN"]);

    const { tenantId } = await params;
    if (ctx.role !== "ROOT" && tenantId !== ctx.tenantId) {
      return NextResponse.json({ error: "Cross-tenant access denied" }, { status: 403 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },
      include: {
        domains: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, tenant });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get tenant";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
