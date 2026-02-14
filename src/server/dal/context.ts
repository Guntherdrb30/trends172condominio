import type { Role } from "@prisma/client";

import type { TenantContext } from "@/server/tenant/context";

export type DalContext = {
  tenantId: string;
  userId?: string;
  role?: Role;
  privileged?: boolean;
};

export function assertTenantContext(ctx: DalContext): asserts ctx is DalContext & { tenantId: string } {
  if (!ctx?.tenantId) {
    throw new Error("Tenant context is required for all DAL operations.");
  }
}

export function createDalContext(ctx: TenantContext | null): DalContext {
  if (!ctx?.tenantId) {
    throw new Error("Missing tenant context.");
  }
  return {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    privileged: ctx.privileged,
  };
}

export function withTenant<T extends Record<string, unknown>>(ctx: DalContext, where?: T) {
  assertTenantContext(ctx);
  if (where && "tenantId" in where && where.tenantId !== ctx.tenantId) {
    throw new Error("Cross-tenant where clause rejected.");
  }
  return {
    ...where,
    tenantId: ctx.tenantId,
  };
}
