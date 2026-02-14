import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { closeSale } from "@/server/services/sales.service";
import { getTenantContext } from "@/server/tenant/context";

const closeSaleSchema = z.object({
  saleId: z.string().cuid(),
  closedAt: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantMembership(await getTenantContext(), ["ADMIN", "ROOT"]);
    const payload = closeSaleSchema.parse(await request.json());
    const result = await closeSale(createDalContext(ctx), {
      saleId: payload.saleId,
      closedAt: payload.closedAt ? new Date(payload.closedAt) : undefined,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to close sale";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

