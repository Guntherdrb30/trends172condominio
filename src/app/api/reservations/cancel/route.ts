import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { cancelReservation } from "@/server/services/reservations.service";
import { getTenantContext } from "@/server/tenant/context";

const cancelReservationSchema = z.object({
  reservationId: z.string().cuid(),
  reason: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantMembership(await getTenantContext(), [
      "CLIENT",
      "SELLER",
      "ADMIN",
      "ROOT",
    ]);
    const payload = cancelReservationSchema.parse(await request.json());
    const reservation = await cancelReservation(
      createDalContext(ctx),
      payload.reservationId,
      payload.reason,
    );
    return NextResponse.json({ ok: true, reservation });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel reservation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

