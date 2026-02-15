import { z } from "zod";

import { prisma } from "@/server/db";
import type { DalContext } from "@/server/dal/context";
import { assertTenantContext } from "@/server/dal/context";
import { writeAuditLog } from "@/server/dal/audit-log";
import { toDecimal } from "@/server/services/decimal";

const createSaleSchema = z.object({
  unitId: z.string().cuid(),
  leadId: z.string().cuid().optional(),
  reservationId: z.string().cuid().optional(),
  buyerId: z.string().cuid().optional(),
  sellerId: z.string().cuid().optional(),
  price: z.coerce.number().nonnegative(),
  notes: z.string().max(2000).optional(),
});

const closeSaleSchema = z.object({
  saleId: z.string().cuid(),
  closedAt: z.coerce.date().optional(),
});

const attachSaleDocsSchema = z.object({
  saleId: z.string().cuid(),
  assetIds: z.array(z.string().cuid()).min(1),
});

export type CreateSaleInput = z.input<typeof createSaleSchema>;

export async function createSale(ctx: DalContext, input: CreateSaleInput) {
  assertTenantContext(ctx);
  const payload = createSaleSchema.parse(input);

  const sale = await prisma.$transaction(async (tx) => {
    const unit = await tx.unit.findFirst({
      where: {
        id: payload.unitId,
        tenantId: ctx.tenantId,
      },
    });

    if (!unit) {
      throw new Error("Unit not found for tenant.");
    }

    if (payload.leadId) {
      const lead = await tx.lead.findFirst({
        where: {
          id: payload.leadId,
          tenantId: ctx.tenantId,
        },
        select: { id: true },
      });
      if (!lead) {
        throw new Error("Lead not found for tenant.");
      }
    }

    if (payload.reservationId) {
      const reservation = await tx.reservation.findFirst({
        where: {
          id: payload.reservationId,
          tenantId: ctx.tenantId,
          unitId: payload.unitId,
        },
        select: { id: true },
      });
      if (!reservation) {
        throw new Error("Reservation not found for tenant and unit.");
      }
    }

    if (payload.buyerId) {
      const buyerMembership = await tx.membership.findFirst({
        where: {
          userId: payload.buyerId,
          tenantId: ctx.tenantId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!buyerMembership) {
        throw new Error("Buyer does not belong to tenant.");
      }
    }

    if (payload.sellerId) {
      const sellerMembership = await tx.membership.findFirst({
        where: {
          userId: payload.sellerId,
          tenantId: ctx.tenantId,
          isActive: true,
          role: {
            in: ["SELLER", "ADMIN", "ROOT"],
          },
        },
        select: { id: true },
      });
      if (!sellerMembership) {
        throw new Error("Seller does not belong to tenant.");
      }
    }

    const created = await tx.sale.create({
      data: {
        tenantId: ctx.tenantId,
        unitId: payload.unitId,
        leadId: payload.leadId,
        reservationId: payload.reservationId,
        buyerId: payload.buyerId,
        sellerId: payload.sellerId ?? ctx.userId,
        price: toDecimal(payload.price),
        status: "OPEN",
        notes: payload.notes,
      },
    });

    await tx.unit.update({
      where: { id: unit.id },
      data: { status: "SOLD" },
    });

    if (payload.reservationId) {
      await tx.reservation.updateMany({
        where: {
          id: payload.reservationId,
          tenantId: ctx.tenantId,
        },
        data: {
          status: "CONVERTED",
        },
      });
    }

    return created;
  });

  await writeAuditLog(ctx, {
    action: "sale.created",
    entityType: "Sale",
    entityId: sale.id,
    metadata: {
      unitId: sale.unitId,
      price: payload.price,
    },
  });

  return sale;
}

export async function closeSale(ctx: DalContext, input: z.input<typeof closeSaleSchema>) {
  assertTenantContext(ctx);
  const payload = closeSaleSchema.parse(input);

  const sale = await prisma.sale.updateMany({
    where: {
      id: payload.saleId,
      tenantId: ctx.tenantId,
      status: "OPEN",
    },
    data: {
      status: "CLOSED",
      closedAt: payload.closedAt ?? new Date(),
    },
  });

  await writeAuditLog(ctx, {
    action: "sale.closed",
    entityType: "Sale",
    entityId: payload.saleId,
    metadata: {
      rows: sale.count,
    },
  });

  return sale;
}

export async function attachSaleDocs(ctx: DalContext, input: z.input<typeof attachSaleDocsSchema>) {
  assertTenantContext(ctx);
  const payload = attachSaleDocsSchema.parse(input);
  const sale = await prisma.sale.findFirst({
    where: {
      id: payload.saleId,
      tenantId: ctx.tenantId,
    },
    select: {
      id: true,
    },
  });
  if (!sale) {
    throw new Error("Sale not found for tenant.");
  }

  const result = await prisma.asset.updateMany({
    where: {
      id: {
        in: payload.assetIds,
      },
      tenantId: ctx.tenantId,
    },
    data: {
      saleId: payload.saleId,
    },
  });

  await writeAuditLog(ctx, {
    action: "sale.docs.attached",
    entityType: "Sale",
    entityId: payload.saleId,
    metadata: {
      assetIds: payload.assetIds,
      affected: result.count,
    },
  });

  return result;
}
