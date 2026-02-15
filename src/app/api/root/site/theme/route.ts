import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import type { DalContext } from "@/server/dal/context";
import { resolveScopedTenantId } from "@/server/root/target-tenant";
import { setThemeSettings } from "@/server/services/site-builder.service";
import { getTenantContext } from "@/server/tenant/context";

const themeSchema = z.object({
  fontPrimary: z.string().optional(),
  fontSecondary: z.string().optional(),
  headerVideoAssetId: z.string().cuid().optional(),
  headerImageAssetId: z.string().cuid().optional(),
  buttonRadius: z.string().optional(),
  settings: z.unknown().optional(),
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
    const theme = await prisma.themeSettings.findUnique({
      where: { tenantId: dalCtx.tenantId },
    });
    return NextResponse.json({ ok: true, theme });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch theme";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, dalCtx } = await getBuilderContext();
    const payload = themeSchema.parse(await request.json());
    const theme = await setThemeSettings(dalCtx, payload);

    await writeAuditLog(
      {
        tenantId: dalCtx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
        privileged: ctx.privileged,
      },
      {
        action: "root.site.theme.updated",
        entityType: "ThemeSettings",
        entityId: theme.id,
      },
    );

    return NextResponse.json({ ok: true, theme });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update theme";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

