import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import { createDalContext } from "@/server/dal/context";
import { getTenantContext } from "@/server/tenant/context";

const querySchema = z.object({
  tenantId: z.string().cuid().optional(),
});

const createRuleSchema = z.object({
  tenantId: z.string().cuid().optional(),
  role: z.enum(["SELLER", "ADMIN", "CLIENT"]).optional(),
  percentage: z.coerce.number().min(0).max(100),
  active: z.boolean().optional(),
});

function resolveTenantId(ctx: { tenantId: string; role?: Role }, tenantId?: string) {
  if (!tenantId) return ctx.tenantId;
  if (ctx.role !== "ROOT" && tenantId !== ctx.tenantId) {
    throw new Error("Cross-tenant commission management denied.");
  }
  return tenantId;
}

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext();
    requireRole(ctx, ["ROOT", "ADMIN"]);
    const url = new URL(request.url);
    const { tenantId } = querySchema.parse({
      tenantId: url.searchParams.get("tenantId") ?? undefined,
    });
    const targetTenantId = resolveTenantId(ctx, tenantId);

    const rules = await prisma.commissionRule.findMany({
      where: {
        tenantId: targetTenantId,
      },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ ok: true, rules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list rules";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext();
    requireRole(ctx, ["ROOT"]);
    const payload = createRuleSchema.parse(await request.json());
    const targetTenantId = resolveTenantId(ctx, payload.tenantId);

    const rule = await prisma.commissionRule.create({
      data: {
        tenantId: targetTenantId,
        role: payload.role,
        percentage: payload.percentage,
        active: payload.active ?? true,
      },
    });

    await writeAuditLog(createDalContext(ctx), {
      action: "root.commission_rule.created",
      entityType: "CommissionRule",
      entityId: rule.id,
      metadata: {
        tenantId: targetTenantId,
        role: payload.role ?? null,
        percentage: payload.percentage,
      },
    });

    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create rule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

