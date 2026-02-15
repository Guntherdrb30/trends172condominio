import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import { createDalContext } from "@/server/dal/context";
import { resolveScopedTenantId } from "@/server/root/target-tenant";
import { getTenantContext } from "@/server/tenant/context";

const querySchema = z.object({
  tenantId: z.string().cuid().optional(),
});

const createUserSchema = z.object({
  tenantId: z.string().cuid().optional(),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.enum(["ADMIN", "SELLER", "CLIENT"]),
});

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext();
    requireRole(ctx, ["ROOT"]);
    const url = new URL(request.url);
    const { tenantId } = querySchema.parse({
      tenantId: url.searchParams.get("tenantId") ?? undefined,
    });
    const scoped = await resolveScopedTenantId({
      role: ctx.role,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    });
    const targetTenantId = tenantId && ctx.role !== "ROOT" ? tenantId : scoped.targetTenantId;

    const memberships = await prisma.membership.findMany({
      where: {
        tenantId: targetTenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      ok: true,
      users: memberships.map((membership) => ({
        membershipId: membership.id,
        role: membership.role,
        user: membership.user,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list users";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext();
    requireRole(ctx, ["ROOT"]);
    const payload = createUserSchema.parse(await request.json());
    if (payload.role === "ADMIN" || payload.role === "SELLER") {
      return NextResponse.json(
        { error: "Admin/Seller creation is invite-only. Use /api/root/invites." },
        { status: 400 },
      );
    }
    const scoped = await resolveScopedTenantId({
      role: ctx.role,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    });
    const targetTenantId =
      payload.tenantId && ctx.role !== "ROOT" ? payload.tenantId : scoped.targetTenantId;

    const existing = await prisma.user.findUnique({
      where: {
        email: payload.email.toLowerCase(),
      },
      select: {
        id: true,
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await hash(payload.password, 10);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: payload.email.toLowerCase(),
          name: payload.name,
          passwordHash,
        },
      });

      const membership = await tx.membership.create({
        data: {
          tenantId: targetTenantId,
          userId: user.id,
          role: payload.role,
        },
      });

      return {
        user,
        membership,
      };
    });

    await writeAuditLog(createDalContext(ctx), {
      action: "root.user.created",
      entityType: "User",
      entityId: created.user.id,
      metadata: {
        tenantId: targetTenantId,
        role: payload.role,
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: created.user.id,
        email: created.user.email,
        name: created.user.name,
        role: created.membership.role,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
