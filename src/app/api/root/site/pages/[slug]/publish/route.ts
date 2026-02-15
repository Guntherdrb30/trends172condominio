import { NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { writeAuditLog } from "@/server/dal/audit-log";
import type { DalContext } from "@/server/dal/context";
import { resolveScopedTenantId } from "@/server/root/target-tenant";
import { publishPage } from "@/server/services/site-builder.service";
import { getTenantContext } from "@/server/tenant/context";

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

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { ctx, dalCtx } = await getBuilderContext();
    const { slug } = await params;
    const published = await publishPage(dalCtx, { slug });
    await writeAuditLog(
      {
        tenantId: dalCtx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
        privileged: ctx.privileged,
      },
      {
        action: "root.site.page.published",
        entityType: "PageVersion",
        entityId: published.id,
      },
    );
    return NextResponse.json({ ok: true, published });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish page";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

