import { Role } from "@prisma/client";

import { prisma } from "@/server/db";
import type { TenantContext } from "@/server/tenant/context";

export class GuardError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "GuardError";
    this.status = status;
  }
}

export function requireAuth(ctx: TenantContext | null): asserts ctx is TenantContext & { userId: string } {
  if (!ctx?.userId) {
    throw new GuardError("Authentication required", 401);
  }
}

export function requireRole(
  ctx: TenantContext | null,
  roles: Role[],
): asserts ctx is TenantContext & { userId: string; role: Role } {
  requireAuth(ctx);
  if (!ctx.role || !roles.includes(ctx.role)) {
    throw new GuardError("Insufficient role", 403);
  }
}

export async function requireTenantMembership(
  ctx: TenantContext | null,
  allowedRoles?: Role[],
): Promise<TenantContext & { userId: string; role: Role }> {
  requireAuth(ctx);
  const membership = await prisma.membership.findFirst({
    where: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      isActive: true,
    },
  });

  if (!membership) {
    throw new GuardError("Tenant membership required", 403);
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new GuardError("Role not allowed for this tenant", 403);
  }

  return {
    ...ctx,
    role: membership.role,
  };
}

export async function requirePlatformRoot(
  ctx: TenantContext | null,
): Promise<TenantContext & { userId: string; role: "ROOT"; platformTenantId: string }> {
  requireAuth(ctx);

  const membership = await prisma.membership.findFirst({
    where: {
      userId: ctx.userId,
      role: "ROOT",
      isActive: true,
      tenant: {
        OR: [{ type: "PLATFORM" }, { isPlatform: true }],
      },
    },
    include: {
      tenant: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  if (!membership?.tenant) {
    throw new GuardError("Platform ROOT membership required", 403);
  }

  return {
    ...ctx,
    role: "ROOT",
    tenantId: membership.tenant.id,
    tenantSlug: membership.tenant.slug,
    platformTenantId: membership.tenant.id,
  };
}

export function requirePrivilegedMode(ctx: TenantContext | null) {
  requireRole(ctx, ["ADMIN", "ROOT"]);
  if (!ctx.privileged && ctx.role !== "ROOT") {
    throw new GuardError("Privileged mode required", 403);
  }
}
