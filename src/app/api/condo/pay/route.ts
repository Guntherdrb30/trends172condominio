import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { registerCondoPayment } from "@/server/services/condo.service";
import { getTenantContext } from "@/server/tenant/context";

const payloadSchema = z.object({
  chargeId: z.string().cuid(),
  amount: z.coerce.number().positive(),
  method: z.string().optional(),
  reference: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantMembership(await getTenantContext(), ["CLIENT", "ADMIN", "ROOT"]);
    const payload = payloadSchema.parse(await request.json());
    const payment = await registerCondoPayment(createDalContext(ctx), payload);
    return NextResponse.json({ ok: true, payment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register condo payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

