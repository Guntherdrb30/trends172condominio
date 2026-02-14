import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { attachSaleDocs } from "@/server/services/sales.service";
import { getTenantContext } from "@/server/tenant/context";

const attachSaleDocsSchema = z.object({
  saleId: z.string().cuid(),
  assetIds: z.array(z.string().cuid()).min(1),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantMembership(await getTenantContext(), [
      "SELLER",
      "ADMIN",
      "ROOT",
    ]);
    const payload = attachSaleDocsSchema.parse(await request.json());
    const result = await attachSaleDocs(createDalContext(ctx), payload);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to attach docs";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

