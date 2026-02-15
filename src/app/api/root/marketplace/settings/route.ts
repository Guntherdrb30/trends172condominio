import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { requirePlatformRoot } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import { createDalContext } from "@/server/dal/context";
import {
  getMarketplaceCandidates,
  getMarketplaceSettings,
  marketplaceSettingsInputSchema,
} from "@/server/services/marketplace.service";
import { getTenantContext } from "@/server/tenant/context";

export async function GET() {
  try {
    await requirePlatformRoot(await getTenantContext());
    const [settings, candidates] = await Promise.all([getMarketplaceSettings(), getMarketplaceCandidates()]);
    return NextResponse.json({
      ok: true,
      settings,
      candidates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load marketplace settings";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const rootCtx = await requirePlatformRoot(await getTenantContext());
    const payload = marketplaceSettingsInputSchema.parse(await request.json());

    const tenant = await prisma.tenant.findUnique({
      where: {
        id: rootCtx.platformTenantId,
      },
      select: {
        featureFlags: true,
      },
    });

    const existingFlags = (tenant?.featureFlags ?? {}) as Record<string, unknown>;
    const updatedFlags: Prisma.InputJsonValue = {
      ...existingFlags,
      marketplace: payload,
    };

    await prisma.tenant.update({
      where: {
        id: rootCtx.platformTenantId,
      },
      data: {
        featureFlags: updatedFlags,
      },
    });

    await writeAuditLog(createDalContext(rootCtx), {
      action: "root.marketplace.settings.updated",
      entityType: "Tenant",
      entityId: rootCtx.platformTenantId,
      metadata: {
        heroCount: payload.heroTypologyIds.length,
        amenitySpotCount: payload.amenitySpotIds.length,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save marketplace settings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
