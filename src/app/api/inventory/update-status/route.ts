import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { updateUnitStatus } from "@/server/services/inventory.service";
import { getTenantContext } from "@/server/tenant/context";

const updateStatusSchema = z.object({
  unitId: z.string().cuid(),
  status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "BLOCKED"]),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantMembership(await getTenantContext(), ["ADMIN", "ROOT", "SELLER"]);
    const payload = updateStatusSchema.parse(await request.json());
    const unit = await updateUnitStatus(createDalContext(ctx), payload.unitId, payload.status, payload.reason);
    return NextResponse.json({ ok: true, unit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update status";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

