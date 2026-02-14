import { type UnitStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import type { DalContext } from "@/server/dal/context";
import { assertTenantContext, withTenant } from "@/server/dal/context";
import { writeAuditLog } from "@/server/dal/audit-log";

const inventoryFilterSchema = z.object({
  status: z
    .enum(["AVAILABLE", "RESERVED", "SOLD", "BLOCKED"])
    .optional(),
  typologyId: z.string().cuid().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  floor: z.coerce.number().int().optional(),
  view: z.string().optional(),
});

export type InventoryFilterInput = z.input<typeof inventoryFilterSchema>;

export async function listInventory(ctx: DalContext, input: InventoryFilterInput) {
  assertTenantContext(ctx);
  const filters = inventoryFilterSchema.parse(input);

  return prisma.unit.findMany({
    where: withTenant(ctx, {
      status: filters.status,
      typologyId: filters.typologyId,
      price: {
        gte: filters.minPrice,
        lte: filters.maxPrice,
      },
      floor: filters.floor
        ? {
            is: {
              number: filters.floor,
            },
          }
        : undefined,
      view: filters.view
        ? {
            contains: filters.view,
            mode: "insensitive",
          }
        : undefined,
    }),
    include: {
      typology: true,
      floor: true,
      tower: true,
    },
    orderBy: [{ status: "asc" }, { code: "asc" }],
  });
}

export async function updateUnitStatus(
  ctx: DalContext,
  unitId: string,
  status: UnitStatus,
  reason?: string,
) {
  assertTenantContext(ctx);
  const unit = await prisma.unit.findFirst({
    where: withTenant(ctx, {
      id: unitId,
    }),
  });
  if (!unit) {
    throw new Error("Unit not found for tenant.");
  }

  const updated = await prisma.unit.update({
    where: {
      id: unit.id,
    },
    data: {
      status,
    },
  });

  await writeAuditLog(ctx, {
    action: "inventory.unit.status.updated",
    entityType: "Unit",
    entityId: unitId,
    metadata: {
      status,
      reason,
    },
  });

  return updated;
}
