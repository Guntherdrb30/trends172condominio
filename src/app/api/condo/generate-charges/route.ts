import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { generateMonthlyCharges } from "@/server/services/condo.service";
import { getTenantContext } from "@/server/tenant/context";

const payloadSchema = z.object({
  planId: z.string().cuid(),
  year: z.coerce.number().int(),
  month: z.coerce.number().int(),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantMembership(await getTenantContext(), ["ADMIN", "ROOT"]);
    const payload = payloadSchema.parse(await request.json());
    const charges = await generateMonthlyCharges(createDalContext(ctx), payload);
    return NextResponse.json({ ok: true, charges });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate charges";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

