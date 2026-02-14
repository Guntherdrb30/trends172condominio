import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { createAppointment } from "@/server/services/appointments.service";
import { getTenantContext } from "@/server/tenant/context";

const createAppointmentSchema = z.object({
  unitId: z.string().cuid().optional(),
  leadId: z.string().cuid().optional(),
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantMembership(await getTenantContext(), ["CLIENT", "SELLER", "ADMIN", "ROOT"]);
    const payload = createAppointmentSchema.parse(await request.json());
    const appointment = await createAppointment(createDalContext(ctx), {
      ...payload,
      scheduledAt: new Date(payload.scheduledAt),
      userId: ctx.userId,
    });
    return NextResponse.json({ ok: true, appointment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create appointment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

