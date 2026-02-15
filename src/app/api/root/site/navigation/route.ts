import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import type { DalContext } from "@/server/dal/context";
import { resolveScopedTenantId } from "@/server/root/target-tenant";
import { setNavigation } from "@/server/services/site-builder.service";
import { getTenantContext } from "@/server/tenant/context";

const navigationSchema = z.object({
  locale: z.enum(["es", "en"]).default("es"),
  draftItems: z.unknown().optional(),
  publishedItems: z.unknown().optional(),
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

export async function GET(request: Request) {
  try {
    const { dalCtx } = await getBuilderContext();
    const url = new URL(request.url);
    const locale = url.searchParams.get("locale") ?? "es";
    const navigation = await prisma.siteNavigation.findUnique({
      where: {
        tenantId_locale: {
          tenantId: dalCtx.tenantId,
          locale: locale.toLowerCase(),
        },
      },
    });
    return NextResponse.json({ ok: true, navigation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch navigation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, dalCtx } = await getBuilderContext();
    const payload = navigationSchema.parse(await request.json());
    const navigation = await setNavigation(dalCtx, payload);

    await writeAuditLog(
      {
        tenantId: dalCtx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
        privileged: ctx.privileged,
      },
      {
        action: "root.site.navigation.updated",
        entityType: "SiteNavigation",
        entityId: navigation.id,
      },
    );

    return NextResponse.json({ ok: true, navigation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update navigation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

