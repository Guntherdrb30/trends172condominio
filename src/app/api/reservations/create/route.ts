import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { createReservation } from "@/server/services/reservations.service";
import { getTenantContext } from "@/server/tenant/context";

const createReservationSchema = z.object({
  unitId: z.string().cuid(),
  leadId: z.string().cuid().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantMembership(await getTenantContext(), ["CLIENT", "SELLER", "ADMIN", "ROOT"]);
    const payload = createReservationSchema.parse(await request.json());
    const reservation = await createReservation(createDalContext(ctx), {
      ...payload,
      userId: ctx.userId,
    });
    return NextResponse.json({ ok: true, reservation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create reservation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

