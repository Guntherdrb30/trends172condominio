import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import type { DalContext } from "@/server/dal/context";
import { assertTenantContext } from "@/server/dal/context";

export type AuditInput = {
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
  userAgent?: string;
};

export async function writeAuditLog(ctx: DalContext, input: AuditInput) {
  assertTenantContext(ctx);
  return prisma.auditLog.create({
    data: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      ip: input.ip,
      userAgent: input.userAgent,
    },
  });
}
