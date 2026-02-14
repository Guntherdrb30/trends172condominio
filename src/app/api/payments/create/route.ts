import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { createPayment } from "@/server/services/payments.service";
import { getTenantContext } from "@/server/tenant/context";

const createPaymentSchema = z.object({
  saleId: z.string().cuid(),
  installmentId: z.string().cuid().optional(),
  amount: z.coerce.number().positive(),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantMembership(await getTenantContext(), ["SELLER", "ADMIN", "ROOT"]);
    const payload = createPaymentSchema.parse(await request.json());
    const payment = await createPayment(createDalContext(ctx), payload);
    return NextResponse.json({ ok: true, payment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

