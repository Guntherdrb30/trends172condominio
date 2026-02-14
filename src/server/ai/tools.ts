import { z } from "zod";

import type { DalContext } from "@/server/dal/context";
import { listInventory } from "@/server/services/inventory.service";
import { createAppointment } from "@/server/services/appointments.service";
import { createReservation } from "@/server/services/reservations.service";
import { generateSignedAssetUrl } from "@/server/services/assets.service";
import { prisma } from "@/server/db";

const searchUnitsSchema = z.object({
  status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "BLOCKED"]).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  typologyId: z.string().cuid().optional(),
});

const getTypologySchema = z.object({
  slug: z.string().min(1),
});

const createAppointmentSchema = z.object({
  unitId: z.string().cuid().optional(),
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
});

const createReservationSchema = z.object({
  unitId: z.string().cuid(),
  notes: z.string().optional(),
});

const getReportsSchema = z.object({
  type: z.enum(["funnel", "ledger"]),
});

const generateSignedAssetUrlSchema = z.object({
  assetId: z.string().cuid(),
  ttlSeconds: z.number().int().positive().max(600).optional(),
});

export const allowedToolNames = [
  "searchUnits",
  "getTypology",
  "createAppointment",
  "createReservation",
  "getReports",
  "generateSignedAssetUrl",
] as const;

export type ToolName = (typeof allowedToolNames)[number];

export async function executeAiTool(ctx: DalContext, toolName: ToolName, input: unknown) {
  switch (toolName) {
    case "searchUnits": {
      return listInventory(ctx, searchUnitsSchema.parse(input));
    }
    case "getTypology": {
      const payload = getTypologySchema.parse(input);
      return prisma.typology.findFirst({
        where: {
          tenantId: ctx.tenantId,
          slug: payload.slug,
        },
        include: {
          media: true,
        },
      });
    }
    case "createAppointment": {
      const payload = createAppointmentSchema.parse(input);
      return createAppointment(ctx, {
        unitId: payload.unitId,
        scheduledAt: new Date(payload.scheduledAt),
        notes: payload.notes,
      });
    }
    case "createReservation": {
      const payload = createReservationSchema.parse(input);
      return createReservation(ctx, payload);
    }
    case "getReports": {
      if (!ctx.role || !["ADMIN", "ROOT"].includes(ctx.role)) {
        throw new Error("Reports tool requires ADMIN or ROOT role.");
      }
      const payload = getReportsSchema.parse(input);
      if (payload.type === "funnel") {
        const [leads, reservations, salesClosed] = await Promise.all([
          prisma.lead.count({ where: { tenantId: ctx.tenantId } }),
          prisma.reservation.count({ where: { tenantId: ctx.tenantId } }),
          prisma.sale.count({ where: { tenantId: ctx.tenantId, status: "CLOSED" } }),
        ]);
        return { leads, reservations, salesClosed };
      }
      const ledger = await prisma.ledgerEntry.groupBy({
        by: ["type"],
        where: { tenantId: ctx.tenantId },
        _sum: { amount: true },
      });
      return ledger;
    }
    case "generateSignedAssetUrl": {
      const payload = generateSignedAssetUrlSchema.parse(input);
      return generateSignedAssetUrl(ctx, payload.assetId, payload.ttlSeconds ?? 120);
    }
    default:
      throw new Error("Unsupported tool");
  }
}
