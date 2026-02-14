import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { generateSignedAssetUrl } from "@/server/services/assets.service";
import { getTenantContext } from "@/server/tenant/context";

const querySchema = z.object({
  assetId: z.string().cuid(),
  ttlSeconds: z.coerce.number().int().positive().max(600).optional(),
});

export async function GET(request: Request) {
  try {
    const ctx = await requireTenantMembership(await getTenantContext());
    const url = new URL(request.url);
    const params = querySchema.parse({
      assetId: url.searchParams.get("assetId"),
      ttlSeconds: url.searchParams.get("ttlSeconds"),
    });

    const signed = await generateSignedAssetUrl(createDalContext(ctx), params.assetId, params.ttlSeconds ?? 120);
    return NextResponse.json(signed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate signed URL";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

