import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import type { DalContext } from "@/server/dal/context";
import { resolveScopedTenantId } from "@/server/root/target-tenant";
import { getTenantContext } from "@/server/tenant/context";

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "SELLER"]),
  expiresHours: z.number().int().min(24).max(72).default(48),
});

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext();
    requireRole(ctx, ["ROOT"]);
    const payload = createInviteSchema.parse(await request.json());
    const scoped = await resolveScopedTenantId({
      role: ctx.role,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    });
    const dalCtx: DalContext = {
      tenantId: scoped.targetTenantId,
      userId: ctx.userId,
      role: ctx.role,
      privileged: ctx.privileged,
    };

    const rawToken = randomBytes(24).toString("base64url");
    const invite = await prisma.inviteToken.create({
      data: {
        tenantId: scoped.targetTenantId,
        email: payload.email.toLowerCase(),
        role: payload.role,
        tokenHash: hashToken(rawToken),
        status: "PENDING",
        createdById: ctx.userId,
        expiresAt: new Date(Date.now() + payload.expiresHours * 60 * 60 * 1000),
      },
    });

    await writeAuditLog(dalCtx, {
      action: "root.invite.created",
      entityType: "InviteToken",
      entityId: invite.id,
      metadata: {
        email: payload.email.toLowerCase(),
        role: payload.role,
        expiresHours: payload.expiresHours,
      },
    });

    return NextResponse.json({
      ok: true,
      inviteId: invite.id,
      token: rawToken,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create invite";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

