import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";

import { prisma } from "@/server/db";
import { normalizeHost } from "@/server/tenant/normalize-host";

const signupSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  locale: z.enum(["ES", "EN", "PT"]).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = signupSchema.parse(await request.json());
    const headerStore = await headers();
    const host = normalizeHost(headerStore.get("x-tenant-host") ?? headerStore.get("host"));
    if (!host) {
      return NextResponse.json({ error: "Tenant host not resolved." }, { status: 400 });
    }

    const domain = await prisma.domain.findFirst({
      where: {
        OR: [{ host }, { normalizedHost: host }],
      },
      include: {
        tenant: {
          select: {
            id: true,
            selfSignupEnabled: true,
            defaultLanguage: true,
          },
        },
      },
    });

    if (!domain?.tenant) {
      return NextResponse.json({ error: "Tenant domain not found." }, { status: 404 });
    }
    if (domain.allowClientSignup === false || domain.tenant.selfSignupEnabled === false) {
      return NextResponse.json({ error: "Client signup is disabled for this tenant." }, { status: 403 });
    }

    const normalizedEmail = payload.email.toLowerCase();
    const passwordHash = await hash(payload.password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      const createdUser =
        existing ??
        (await tx.user.create({
          data: {
            email: normalizedEmail,
            name: payload.name,
            passwordHash,
            locale: payload.locale ?? domain.tenant.defaultLanguage,
          },
        }));

      const existingMembership = await tx.membership.findFirst({
        where: {
          userId: createdUser.id,
          tenantId: domain.tenant.id,
        },
      });
      if (!existingMembership) {
        await tx.membership.create({
          data: {
            tenantId: domain.tenant.id,
            userId: createdUser.id,
            role: "CLIENT",
          },
        });
      }

      return createdUser;
    });

    await prisma.auditLog.create({
      data: {
        tenantId: domain.tenant.id,
        userId: user.id,
        action: "auth.client_signup.completed",
        entityType: "User",
        entityId: user.id,
      },
    });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

