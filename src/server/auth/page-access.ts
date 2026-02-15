import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { requirePlatformRoot, requireTenantMembership } from "@/server/auth/guards";
import { getTenantContext } from "@/server/tenant/context";

export async function requirePageAccess(roles: Role[], loginNextPath: string) {
  try {
    const ctx = await getTenantContext();
    const tenantCtx =
      roles.length === 1 && roles[0] === "ROOT"
        ? await requirePlatformRoot(ctx)
        : await requireTenantMembership(ctx, roles);
    return tenantCtx;
  } catch {
    redirect(`/login?next=${encodeURIComponent(loginNextPath)}`);
  }
}
