import { headers } from "next/headers";
import { Role } from "@prisma/client";

import { getAuthSession } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { readPrivilegedCookie } from "@/server/security/privileged-mode";
import { normalizeHost } from "@/server/tenant/normalize-host";

export type TenantContext = {
  tenantId: string;
  tenantSlug: string;
  host: string;
  userId?: string;
  role?: Role;
  privileged: boolean;
};

function rolePriority(role: Role) {
  switch (role) {
    case "ROOT":
      return 1;
    case "ADMIN":
      return 2;
    case "SELLER":
      return 3;
    case "CLIENT":
      return 4;
    default:
      return 10;
  }
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const headerStore = await headers();
  const host = normalizeHost(headerStore.get("x-tenant-host") ?? headerStore.get("host"));
  if (!host) return null;

  const domain = await prisma.domain.findFirst({
    where: {
      host: {
        equals: host,
        mode: "insensitive",
      },
    },
    include: {
      tenant: true,
    },
  });

  const fallbackDomain =
    domain ??
    (host.includes("localhost")
      ? await prisma.domain.findFirst({
          where: {
            host: "localhost",
          },
          include: {
            tenant: true,
          },
        })
      : null);

  if (!fallbackDomain?.tenant) {
    return null;
  }

  const session = await getAuthSession();
  const userId = session?.user?.id;
  let role: Role | undefined = session?.user?.role;

  if (userId && !role) {
    const memberships = await prisma.membership.findMany({
      where: {
        userId,
        tenantId: fallbackDomain.tenantId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    role = memberships.sort((a, b) => rolePriority(a.role) - rolePriority(b.role))[0]?.role;
  }

  const privileged = Boolean(await readPrivilegedCookie());

  return {
    tenantId: fallbackDomain.tenantId,
    tenantSlug: fallbackDomain.tenant.slug,
    host,
    userId: userId ?? undefined,
    role,
    privileged,
  };
}

