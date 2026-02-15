import { NextResponse } from "next/server";
import { PageKind } from "@prisma/client";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { writeAuditLog } from "@/server/dal/audit-log";
import type { DalContext } from "@/server/dal/context";
import { resolveScopedTenantId } from "@/server/root/target-tenant";
import { createPageDraft, listPages } from "@/server/services/site-builder.service";
import { getTenantContext } from "@/server/tenant/context";

const createPageSchema = z.object({
  slug: z.string().min(1),
  kind: z.nativeEnum(PageKind).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  template: z.enum(["blank", "home", "availability"]).optional(),
});

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

export async function GET() {
  try {
    const { dalCtx } = await getBuilderContext();
    const pages = await listPages(dalCtx);
    return NextResponse.json({ ok: true, pages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list pages";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, dalCtx } = await getBuilderContext();
    const payload = createPageSchema.parse(await request.json());
    const draft = await createPageDraft(dalCtx, payload);

    await writeAuditLog(
      {
        tenantId: dalCtx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
        privileged: ctx.privileged,
      },
      {
        action: "root.site.page_draft.created",
        entityType: "PageVersion",
        entityId: draft.id,
        metadata: payload,
      },
    );

    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create page draft";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

