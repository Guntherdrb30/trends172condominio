import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { writeAuditLog } from "@/server/dal/audit-log";
import type { DalContext } from "@/server/dal/context";
import { resolveScopedTenantId } from "@/server/root/target-tenant";
import { rollbackPage } from "@/server/services/site-builder.service";
import { getTenantContext } from "@/server/tenant/context";

const rollbackSchema = z.object({
  versionNumber: z.number().int().positive(),
});

type RouteParams = {
  params: Promise<{ slug: string }>;
};

async function getBuilderContext() {
  const ctx = await getTenantContext();
  requireRole(ctx, ["ROOT"]);
  const scoped = await resolveScopedTenantId({
    role: ctx.role,
    tenantId: ctx.tenantId,
    userId: ctx.userId,
  });
  const dalCtx: DalContext = {
    tenantId: scoped.targetTenantId,
    userId: ctx.userId,
    role: ctx.role,
    privileged: ctx.privileged,
  };
  return { ctx, dalCtx };
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { ctx, dalCtx } = await getBuilderContext();
    const { slug } = await params;
    const payload = rollbackSchema.parse(await request.json());
    const version = await rollbackPage(dalCtx, {
      slug,
      versionNumber: payload.versionNumber,
    });
    await writeAuditLog(
      {
        tenantId: dalCtx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
        privileged: ctx.privileged,
      },
      {
        action: "root.site.page.rollback",
        entityType: "PageVersion",
        entityId: version.id,
        metadata: { versionNumber: payload.versionNumber },
      },
    );
    return NextResponse.json({ ok: true, version });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to rollback page";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

