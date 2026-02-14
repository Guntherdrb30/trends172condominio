import { ReservationStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import type { DalContext } from "@/server/dal/context";
import { assertTenantContext } from "@/server/dal/context";
import { writeAuditLog } from "@/server/dal/audit-log";

const createReservationSchema = z.object({
  unitId: z.string().cuid(),
  leadId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  notes: z.string().max(1000).optional(),
  ttlHours: z.coerce.number().int().positive().max(168).optional(),
});

export type CreateReservationInput = z.input<typeof createReservationSchema>;

export async function createReservation(ctx: DalContext, input: CreateReservationInput) {
  assertTenantContext(ctx);
  const payload = createReservationSchema.parse(input);

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: ctx.tenantId },
    select: { reservationTtlHours: true },
  });

  const ttlHours = payload.ttlHours ?? tenant.reservationTtlHours;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const unit = await tx.unit.findFirst({
      where: {
        id: payload.unitId,
        tenantId: ctx.tenantId,
      },
    });

    if (!unit || unit.status !== "AVAILABLE") {
      throw new Error("Unit is not available for reservation.");
    }

    const reservation = await tx.reservation.create({
      data: {
        tenantId: ctx.tenantId,
        unitId: payload.unitId,
        leadId: payload.leadId,
        userId: payload.userId ?? ctx.userId,
        notes: payload.notes,
        expiresAt,
      },
    });

    await tx.unit.update({
      where: {
        id: unit.id,
      },
      data: {
        status: "RESERVED",
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: "reservation.created",
        entityType: "Reservation",
        entityId: reservation.id,
        metadata: {
          unitId: payload.unitId,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    return reservation;
  });
}

export async function expireReservations(ctx: DalContext) {
  assertTenantContext(ctx);
  const now = new Date();

  const dueReservations = await prisma.reservation.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: ReservationStatus.ACTIVE,
      expiresAt: {
        lte: now,
      },
    },
    select: {
      id: true,
      unitId: true,
    },
  });

  await prisma.$transaction([
    prisma.reservation.updateMany({
      where: {
        tenantId: ctx.tenantId,
        status: ReservationStatus.ACTIVE,
        expiresAt: {
          lte: now,
        },
      },
      data: {
        status: ReservationStatus.EXPIRED,
      },
    }),
    ...dueReservations.map((reservation) =>
      prisma.unit.updateMany({
        where: {
          id: reservation.unitId,
          tenantId: ctx.tenantId,
          status: "RESERVED",
        },
        data: {
          status: "AVAILABLE",
        },
      }),
    ),
  ]);

  await writeAuditLog(ctx, {
    action: "reservation.expired.batch",
    metadata: {
      count: dueReservations.length,
    },
  });

  return {
    count: dueReservations.length,
  };
}

export async function cancelReservation(ctx: DalContext, reservationId: string, reason?: string) {
  assertTenantContext(ctx);

  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findFirst({
      where: {
        id: reservationId,
        tenantId: ctx.tenantId,
      },
    });

    if (!reservation) {
      throw new Error("Reservation not found.");
    }

    if (ctx.role === "CLIENT" && reservation.userId !== ctx.userId) {
      throw new Error("Clients can only cancel their own reservations.");
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new Error("Only active reservations can be canceled.");
    }

    const updated = await tx.reservation.update({
      where: {
        id: reservation.id,
      },
      data: {
        status: ReservationStatus.CANCELED,
      },
    });

    await tx.unit.updateMany({
      where: {
        id: reservation.unitId,
        tenantId: ctx.tenantId,
      },
      data: {
        status: "AVAILABLE",
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: "reservation.canceled",
        entityType: "Reservation",
        entityId: reservationId,
        metadata: { reason },
      },
    });

    return updated;
  });
}
