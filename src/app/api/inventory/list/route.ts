import { NextResponse } from "next/server";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { listInventory } from "@/server/services/inventory.service";
import { getTenantContext } from "@/server/tenant/context";

export async function GET(request: Request) {
  try {
    const ctx = await requireTenantMembership(await getTenantContext());
    const url = new URL(request.url);
    const units = await listInventory(createDalContext(ctx), {
      status: (url.searchParams.get("status") as "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED" | null) ?? undefined,
      typologyId: url.searchParams.get("typologyId") ?? undefined,
      minPrice: url.searchParams.get("minPrice") ?? undefined,
      maxPrice: url.searchParams.get("maxPrice") ?? undefined,
      floor: url.searchParams.get("floor") ?? undefined,
      view: url.searchParams.get("view") ?? undefined,
    });

    return NextResponse.json({ ok: true, units });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list inventory";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

