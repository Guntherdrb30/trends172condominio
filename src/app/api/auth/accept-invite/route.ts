import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/server/db";

const acceptInviteSchema = z.object({
  token: z.string().min(10),
  name: z.string().min(2).max(120),
  password: z.string().min(6).max(128),
  locale: z.enum(["ES", "EN", "PT"]).optional(),
});

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  try {
    const payload = acceptInviteSchema.parse(await request.json());
    const tokenHash = hashToken(payload.token);

    const invite = await prisma.inviteToken.findFirst({
      where: {
        tokenHash,
        status: "PENDING",
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            defaultLanguage: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite token invalid or expired." }, { status: 404 });
    }

    const passwordHash = await hash(payload.password, 10);
    const normalizedEmail = invite.email.toLowerCase();

    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            email: normalizedEmail,
            name: payload.name,
            passwordHash,
            locale: payload.locale ?? invite.tenant.defaultLanguage,
          },
        }));

      const membership = await tx.membership.upsert({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: invite.tenantId,
          },
        },
        update: {
          role: invite.role,
          inviteTokenId: invite.id,
          isActive: true,
        },
        create: {
          tenantId: invite.tenantId,
          userId: user.id,
          role: invite.role,
          inviteTokenId: invite.id,
          invitedById: invite.createdById,
          isActive: true,
        },
      });

      await tx.inviteToken.update({
        where: { id: invite.id },
        data: {
          status: "ACCEPTED",
          acceptedById: user.id,
          acceptedAt: new Date(),
        },
      });

      return { user, membership };
    });

    await prisma.auditLog.create({
      data: {
        tenantId: invite.tenantId,
        userId: result.user.id,
        action: "auth.invite.accepted",
        entityType: "InviteToken",
        entityId: invite.id,
        metadata: {
          role: invite.role,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      userId: result.user.id,
      role: result.membership.role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invite acceptance failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

