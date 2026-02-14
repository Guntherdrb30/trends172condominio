import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/server/db";
import type { DalContext } from "@/server/dal/context";
import { assertTenantContext } from "@/server/dal/context";
import { writeAuditLog } from "@/server/dal/audit-log";
import { toDecimal } from "@/server/services/decimal";

const createPaymentSchema = z.object({
  saleId: z.string().cuid(),
  installmentId: z.string().cuid().optional(),
  amount: z.coerce.number().positive(),
  method: z.string().max(64).optional(),
  reference: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
});

export type CreatePaymentInput = z.input<typeof createPaymentSchema>;

function calcPctAmount(base: Prisma.Decimal, pct: Prisma.Decimal) {
  return base.mul(pct).div(100);
}

function calcInstallmentStatus(amount: Prisma.Decimal, paid: Prisma.Decimal) {
  if (paid.greaterThanOrEqualTo(amount)) return "PAID";
  if (paid.greaterThan(0)) return "PARTIAL";
  return "PENDING";
}

export async function createPayment(ctx: DalContext, input: CreatePaymentInput) {
  assertTenantContext(ctx);
  const payload = createPaymentSchema.parse(input);
  const paymentAmount = toDecimal(payload.amount);

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: {
        id: payload.saleId,
        tenantId: ctx.tenantId,
      },
      include: {
        tenant: true,
      },
    });

    if (!sale) {
      throw new Error("Sale not found.");
    }

    const commissionRule = await tx.commissionRule.findFirst({
      where: {
        tenantId: ctx.tenantId,
        active: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const commissionPct = commissionRule?.percentage ?? sale.tenant.sellerCommissionPct;
    const platformFeePct = sale.tenant.platformFeePct;
    const platformFee = calcPctAmount(paymentAmount, platformFeePct);
    const sellerCommission = calcPctAmount(paymentAmount, commissionPct);
    const netToProject = paymentAmount.minus(platformFee).minus(sellerCommission);

    const payment = await tx.payment.create({
      data: {
        tenantId: ctx.tenantId,
        saleId: payload.saleId,
        installmentId: payload.installmentId,
        amount: paymentAmount,
        method: payload.method,
        reference: payload.reference,
        notes: payload.notes,
        registeredById: ctx.userId,
        status: "CONFIRMED",
      },
    });

    if (payload.installmentId) {
      const installment = await tx.installment.findFirst({
        where: {
          id: payload.installmentId,
          tenantId: ctx.tenantId,
        },
      });

      if (!installment) {
        throw new Error("Installment not found.");
      }

      const newPaidAmount = installment.paidAmount.add(paymentAmount);
      await tx.installment.update({
        where: {
          id: installment.id,
        },
        data: {
          paidAmount: newPaidAmount,
          status: calcInstallmentStatus(installment.amount, newPaidAmount),
        },
      });
    }

    if (sale.sellerId) {
      await tx.commissionEntry.create({
        data: {
          tenantId: ctx.tenantId,
          saleId: sale.id,
          sellerId: sale.sellerId,
          ruleId: commissionRule?.id,
          percentage: commissionPct,
          amount: sellerCommission,
        },
      });
    }

    const ledgerEntries = await tx.ledgerEntry.createMany({
      data: [
        {
          tenantId: ctx.tenantId,
          saleId: sale.id,
          paymentId: payment.id,
          type: "PAYMENT_RECEIVED",
          amount: paymentAmount,
          notes: "Gross payment recorded",
        },
        {
          tenantId: ctx.tenantId,
          saleId: sale.id,
          paymentId: payment.id,
          type: "PLATFORM_FEE",
          amount: platformFee,
          notes: "Platform fee 2%",
        },
        {
          tenantId: ctx.tenantId,
          saleId: sale.id,
          paymentId: payment.id,
          type: "SELLER_COMMISSION",
          amount: sellerCommission,
          notes: "Seller commission",
        },
        {
          tenantId: ctx.tenantId,
          saleId: sale.id,
          paymentId: payment.id,
          type: "NET_TO_PROJECT",
          amount: netToProject,
          notes: "Net funds to project account",
        },
      ],
    });

    return {
      payment,
      ledgerCount: ledgerEntries.count,
      platformFee,
      sellerCommission,
      netToProject,
    };
  });

  await writeAuditLog(ctx, {
    action: "payment.created",
    entityType: "Payment",
    entityId: result.payment.id,
    metadata: {
      saleId: payload.saleId,
      amount: payload.amount,
      ledgerCount: result.ledgerCount,
    },
  });

  return result;
}

