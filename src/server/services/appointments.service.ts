import { z } from "zod";

import { prisma } from "@/server/db";
import type { DalContext } from "@/server/dal/context";
import { assertTenantContext } from "@/server/dal/context";
import { writeAuditLog } from "@/server/dal/audit-log";

const createAppointmentSchema = z.object({
  leadId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  unitId: z.string().cuid().optional(),
  scheduledAt: z.coerce.date(),
  channel: z.string().max(64).optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateAppointmentInput = z.input<typeof createAppointmentSchema>;

export async function createAppointment(ctx: DalContext, input: CreateAppointmentInput) {
  assertTenantContext(ctx);
  const payload = createAppointmentSchema.parse(input);

  const appointment = await prisma.appointment.create({
    data: {
      tenantId: ctx.tenantId,
      leadId: payload.leadId,
      userId: payload.userId ?? ctx.userId,
      unitId: payload.unitId,
      scheduledAt: payload.scheduledAt,
      channel: payload.channel,
      notes: payload.notes,
    },
  });

  await writeAuditLog(ctx, {
    action: "appointment.created",
    entityType: "Appointment",
    entityId: appointment.id,
    metadata: {
      scheduledAt: payload.scheduledAt.toISOString(),
    },
  });

  return appointment;
}

export async function listAppointments(ctx: DalContext, from?: Date, to?: Date) {
  assertTenantContext(ctx);
  return prisma.appointment.findMany({
    where: {
      tenantId: ctx.tenantId,
      scheduledAt:
        from || to
          ? {
              gte: from,
              lte: to,
            }
          : undefined,
    },
    include: {
      lead: true,
      unit: true,
      user: true,
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });
}

