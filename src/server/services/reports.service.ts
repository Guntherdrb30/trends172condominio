import { LedgerEntryType } from "@prisma/client";

import { prisma } from "@/server/db";
import type { DalContext } from "@/server/dal/context";
import { assertTenantContext } from "@/server/dal/context";

function toNumber(value: { toNumber: () => number } | null | undefined) {
  if (!value) return 0;
  return value.toNumber();
}

export type TenantReportsSummary = {
  tenantId: string;
  leads: number;
  reservations: {
    active: number;
    expiring24h: number;
    total: number;
  };
  sales: {
    open: number;
    closed: number;
    canceled: number;
    closedVolume: number;
  };
  payments: {
    totalReceived: number;
    count: number;
  };
  ledger: {
    paymentReceived: number;
    platformFee: number;
    sellerCommission: number;
    netToProject: number;
  };
  commissions: {
    entries: number;
    total: number;
  };
  condo: {
    charges: number;
    paid: number;
    outstanding: number;
    overdueCount: number;
  };
  funnel30d: {
    viewHome: number;
    viewUnit: number;
    startReservation: number;
    completeReservation: number;
    scheduleAppointment: number;
  };
};

function resolveTenantId(ctx: DalContext, tenantId?: string) {
  assertTenantContext(ctx);
  if (!tenantId) return ctx.tenantId;
  if (ctx.role !== "ROOT" && tenantId !== ctx.tenantId) {
    throw new Error("Cross-tenant report access denied.");
  }
  return tenantId;
}

export async function getTenantReportsSummary(
  ctx: DalContext,
  input?: { tenantId?: string },
): Promise<TenantReportsSummary> {
  const tenantId = resolveTenantId(ctx, input?.tenantId);
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    leads,
    reservationsTotal,
    reservationsActive,
    reservationsExpiring24h,
    salesOpen,
    salesClosed,
    salesCanceled,
    salesClosedAgg,
    paymentsAgg,
    paymentCount,
    ledgerByType,
    commissionsAgg,
    commissionCount,
    condoChargesAgg,
    condoOverdueCount,
    analyticsByEvent,
  ] = await Promise.all([
    prisma.lead.count({ where: { tenantId } }),
    prisma.reservation.count({ where: { tenantId } }),
    prisma.reservation.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.reservation.count({
      where: {
        tenantId,
        status: "ACTIVE",
        expiresAt: { gte: now, lte: next24h },
      },
    }),
    prisma.sale.count({ where: { tenantId, status: "OPEN" } }),
    prisma.sale.count({ where: { tenantId, status: "CLOSED" } }),
    prisma.sale.count({ where: { tenantId, status: "CANCELED" } }),
    prisma.sale.aggregate({
      where: { tenantId, status: "CLOSED" },
      _sum: { price: true },
    }),
    prisma.payment.aggregate({
      where: { tenantId, status: "CONFIRMED" },
      _sum: { amount: true },
    }),
    prisma.payment.count({ where: { tenantId, status: "CONFIRMED" } }),
    prisma.ledgerEntry.groupBy({
      by: ["type"],
      where: { tenantId },
      _sum: { amount: true },
    }),
    prisma.commissionEntry.aggregate({
      where: { tenantId },
      _sum: { amount: true },
    }),
    prisma.commissionEntry.count({ where: { tenantId } }),
    prisma.condoFeeCharge.aggregate({
      where: { tenantId },
      _sum: { amount: true, paidAmount: true },
    }),
    prisma.condoFeeCharge.count({
      where: { tenantId, status: "OVERDUE" },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["event"],
      where: {
        tenantId,
        createdAt: { gte: last30d },
      },
      _count: { event: true },
    }),
  ]);

  const ledgerMap = new Map<LedgerEntryType, number>(
    ledgerByType.map((item) => [item.type, toNumber(item._sum.amount)]),
  );

  const funnelMap = new Map<string, number>(
    analyticsByEvent.map((item) => [item.event, item._count.event]),
  );

  const condoCharges = toNumber(condoChargesAgg._sum.amount);
  const condoPaid = toNumber(condoChargesAgg._sum.paidAmount);

  return {
    tenantId,
    leads,
    reservations: {
      active: reservationsActive,
      expiring24h: reservationsExpiring24h,
      total: reservationsTotal,
    },
    sales: {
      open: salesOpen,
      closed: salesClosed,
      canceled: salesCanceled,
      closedVolume: toNumber(salesClosedAgg._sum.price),
    },
    payments: {
      totalReceived: toNumber(paymentsAgg._sum.amount),
      count: paymentCount,
    },
    ledger: {
      paymentReceived: ledgerMap.get("PAYMENT_RECEIVED") ?? 0,
      platformFee: ledgerMap.get("PLATFORM_FEE") ?? 0,
      sellerCommission: ledgerMap.get("SELLER_COMMISSION") ?? 0,
      netToProject: ledgerMap.get("NET_TO_PROJECT") ?? 0,
    },
    commissions: {
      entries: commissionCount,
      total: toNumber(commissionsAgg._sum.amount),
    },
    condo: {
      charges: condoCharges,
      paid: condoPaid,
      outstanding: Math.max(0, condoCharges - condoPaid),
      overdueCount: condoOverdueCount,
    },
    funnel30d: {
      viewHome: funnelMap.get("view_home") ?? 0,
      viewUnit: funnelMap.get("view_unit") ?? 0,
      startReservation: funnelMap.get("start_reservation") ?? 0,
      completeReservation: funnelMap.get("complete_reservation") ?? 0,
      scheduleAppointment: funnelMap.get("schedule_appointment") ?? 0,
    },
  };
}

