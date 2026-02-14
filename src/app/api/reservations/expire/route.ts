import { NextResponse } from "next/server";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { expireReservations } from "@/server/services/reservations.service";
import { getTenantContext } from "@/server/tenant/context";

export async function POST() {
  try {
    const ctx = await requireTenantMembership(await getTenantContext(), ["ADMIN", "ROOT"]);
    const result = await expireReservations(createDalContext(ctx));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to expire reservations";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

