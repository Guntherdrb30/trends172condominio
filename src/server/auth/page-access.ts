import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { requireTenantMembership } from "@/server/auth/guards";
import { getTenantContext } from "@/server/tenant/context";

export async function requirePageAccess(roles: Role[], loginNextPath: string) {
  try {
    const tenantCtx = await requireTenantMembership(await getTenantContext(), roles);
    return tenantCtx;
  } catch {
    redirect(`/login?next=${encodeURIComponent(loginNextPath)}`);
  }
}

