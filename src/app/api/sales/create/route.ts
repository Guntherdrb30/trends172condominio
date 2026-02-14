import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { createSale } from "@/server/services/sales.service";
import { getTenantContext } from "@/server/tenant/context";

const createSaleSchema = z.object({
  unitId: z.string().cuid(),
  leadId: z.string().cuid().optional(),
  reservationId: z.string().cuid().optional(),
  buyerId: z.string().cuid().optional(),
  sellerId: z.string().cuid().optional(),
  price: z.coerce.number().positive(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantMembership(await getTenantContext(), ["SELLER", "ADMIN", "ROOT"]);
    const payload = createSaleSchema.parse(await request.json());
    const sale = await createSale(createDalContext(ctx), payload);
    return NextResponse.json({ ok: true, sale });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create sale";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

