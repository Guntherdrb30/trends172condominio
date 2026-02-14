import { NextResponse } from "next/server";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { listAppointments } from "@/server/services/appointments.service";
import { getTenantContext } from "@/server/tenant/context";

export async function GET(request: Request) {
  try {
    const ctx = await requireTenantMembership(await getTenantContext(), ["SELLER", "ADMIN", "ROOT"]);
    const url = new URL(request.url);
    const from = url.searchParams.get("from") ? new Date(url.searchParams.get("from") as string) : undefined;
    const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to") as string) : undefined;
    const appointments = await listAppointments(createDalContext(ctx), from, to);
    return NextResponse.json({ ok: true, appointments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list appointments";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

