import { NextResponse } from "next/server";
import { z } from "zod";

import { createDalContext } from "@/server/dal/context";
import { trackEvent } from "@/server/analytics/track-event";
import { getTenantContext } from "@/server/tenant/context";

const analyticsEventSchema = z.object({
  event: z.string().min(1),
  path: z.string().optional(),
  referrer: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
    }

    const payload = analyticsEventSchema.parse(await request.json());
    await trackEvent(createDalContext(ctx), payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Track failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

