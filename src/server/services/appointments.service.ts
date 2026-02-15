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
  const appointmentUserId = payload.userId ?? ctx.userId;

  if (ctx.role === "CLIENT" && appointmentUserId !== ctx.userId) {
    throw new Error("Clients can only create appointments for themselves.");
  }

  const [lead, unit] = await Promise.all([
    payload.leadId
      ? prisma.lead.findFirst({
          where: {
            id: payload.leadId,
            tenantId: ctx.tenantId,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    payload.unitId
      ? prisma.unit.findFirst({
          where: {
            id: payload.unitId,
            tenantId: ctx.tenantId,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (payload.leadId && !lead) {
    throw new Error("Lead not found for tenant.");
  }
  if (payload.unitId && !unit) {
    throw new Error("Unit not found for tenant.");
  }

  const appointment = await prisma.appointment.create({
    data: {
      tenantId: ctx.tenantId,
      leadId: payload.leadId,
      userId: appointmentUserId,
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
