import { z } from "zod";

import { prisma } from "@/server/db";
import type { DalContext } from "@/server/dal/context";
import { assertTenantContext } from "@/server/dal/context";
import { writeAuditLog } from "@/server/dal/audit-log";
import { toDecimal } from "@/server/services/decimal";

const generateChargesSchema = z.object({
  planId: z.string().cuid(),
  year: z.coerce.number().int().min(2020),
  month: z.coerce.number().int().min(1).max(12),
});

const registerCondoPaymentSchema = z.object({
  chargeId: z.string().cuid(),
  amount: z.coerce.number().positive(),
  method: z.string().max(64).optional(),
  reference: z.string().max(120).optional(),
});

export async function generateMonthlyCharges(ctx: DalContext, input: z.input<typeof generateChargesSchema>) {
  assertTenantContext(ctx);
  const payload = generateChargesSchema.parse(input);

  const plan = await prisma.condoFeePlan.findFirst({
    where: {
      id: payload.planId,
      tenantId: ctx.tenantId,
      active: true,
    },
  });

  if (!plan) {
    throw new Error("Condo fee plan not found.");
  }

  const ownerAccounts = await prisma.ownerAccount.findMany({
    where: {
      tenantId: ctx.tenantId,
      unitId: {
        not: null,
      },
    },
  });

  const dueDate = new Date(Date.UTC(payload.year, payload.month - 1, 10, 12, 0, 0));
  const created = await prisma.$transaction(
    ownerAccounts.map((owner) =>
      prisma.condoFeeCharge.create({
        data: {
          tenantId: ctx.tenantId,
          planId: plan.id,
          unitId: owner.unitId as string,
          ownerAccountId: owner.id,
          dueDate,
          amount: plan.monthlyFee,
          lateFeeAmount: toDecimal(0),
        },
      }),
    ),
  );

  await writeAuditLog(ctx, {
    action: "condo.charges.generated",
    entityType: "CondoFeeCharge",
    metadata: {
      planId: plan.id,
      year: payload.year,
      month: payload.month,
      count: created.length,
    },
  });

  return created;
}

export async function registerCondoPayment(
  ctx: DalContext,
  input: z.input<typeof registerCondoPaymentSchema>,
) {
  assertTenantContext(ctx);
  const payload = registerCondoPaymentSchema.parse(input);
  const amount = toDecimal(payload.amount);

  const payment = await prisma.$transaction(async (tx) => {
    const charge = await tx.condoFeeCharge.findFirst({
      where: {
        id: payload.chargeId,
        tenantId: ctx.tenantId,
      },
      select: {
        id: true,
        ownerAccountId: true,
        paidAmount: true,
        amount: true,
        lateFeeAmount: true,
        dueDate: true,
      },
    });

    if (!charge) {
      throw new Error("Charge not found.");
    }

    if (ctx.role === "CLIENT") {
      if (!ctx.userId) {
        throw new Error("Authenticated client required.");
      }
      const ownerAccount = await tx.ownerAccount.findFirst({
        where: {
          id: charge.ownerAccountId,
          tenantId: ctx.tenantId,
          userId: ctx.userId,
        },
        select: { id: true },
      });
      if (!ownerAccount) {
        throw new Error("Charge does not belong to authenticated client.");
      }
    }

    const payment = await tx.condoFeePayment.create({
      data: {
        tenantId: ctx.tenantId,
        chargeId: charge.id,
        amount,
        method: payload.method,
        reference: payload.reference,
      },
    });

    const paidAmount = charge.paidAmount.add(amount);
    let status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" = "PENDING";
    if (paidAmount.greaterThanOrEqualTo(charge.amount.add(charge.lateFeeAmount))) {
      status = "PAID";
    } else if (paidAmount.greaterThan(0)) {
      status = "PARTIAL";
    } else if (charge.dueDate.getTime() < Date.now()) {
      status = "OVERDUE";
    }

    await tx.condoFeeCharge.update({
      where: {
        id: charge.id,
      },
      data: {
        paidAmount,
        status,
      },
    });

    return payment;
  });

  await writeAuditLog(ctx, {
    action: "condo.payment.registered",
    entityType: "CondoFeePayment",
    entityId: payment.id,
    metadata: {
      chargeId: payload.chargeId,
      amount: payload.amount,
    },
  });

  return payment;
}

export async function getCondoStatement(ctx: DalContext, ownerAccountId: string) {
  assertTenantContext(ctx);
  if (ctx.role === "CLIENT" && !ctx.userId) {
    throw new Error("Authenticated client required.");
  }

  return prisma.ownerAccount.findFirst({
    where: {
      id: ownerAccountId,
      tenantId: ctx.tenantId,
      userId: ctx.role === "CLIENT" ? ctx.userId : undefined,
    },
    include: {
      condoCharges: {
        orderBy: {
          dueDate: "desc",
        },
        include: {
          payments: {
            orderBy: {
              paidAt: "desc",
            },
          },
          unit: true,
        },
      },
    },
  });
}
