import { NextResponse } from "next/server";

import { requireTenantMembership } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { getCondoStatement } from "@/server/services/condo.service";
import { getTenantContext } from "@/server/tenant/context";

export async function GET(request: Request) {
  try {
    const ctx = await requireTenantMembership(await getTenantContext(), ["CLIENT", "ADMIN", "ROOT"]);
    const url = new URL(request.url);
    const ownerAccountId = url.searchParams.get("ownerAccountId");
    if (!ownerAccountId) {
      return NextResponse.json({ error: "ownerAccountId is required" }, { status: 400 });
    }
    const statement = await getCondoStatement(createDalContext(ctx), ownerAccountId);
    return NextResponse.json({ ok: true, statement });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch statement";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

