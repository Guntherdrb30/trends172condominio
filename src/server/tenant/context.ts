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
  const host = normalizeHost(headerStore.get("x-tenant-host") ?? headerStore.get("host")) ?? "unknown-host";

  const domain = await prisma.domain.findFirst({
    where: {
      OR: [{ host }, { normalizedHost: host }],
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

  const fallbackDomain =
    domain ??
    (host.includes("localhost")
      ? await prisma.domain.findFirst({
          where: {
            OR: [{ host: "localhost" }, { normalizedHost: "localhost" }],
          },
          include: {
            tenant: {
              select: {
                id: true,
                slug: true,
              },
            },
          },
        })
      : host.endsWith(".vercel.app")
        ? await prisma.domain.findFirst({
            where: {
              isPrimary: true,
            },
            include: {
              tenant: {
                select: {
                  id: true,
                  slug: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          })
        : null);

  const session = await getAuthSession();
  const userId = session?.user?.id;
  let role: Role | undefined = session?.user?.role;
  let tenantId = fallbackDomain?.tenantId;
  let tenantSlug = fallbackDomain?.tenant?.slug;

  if (userId && role === "ROOT") {
    const platformRootMembership = await prisma.membership.findFirst({
      where: {
        userId,
        role: "ROOT",
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
    if (platformRootMembership?.tenant) {
      tenantId = platformRootMembership.tenant.id;
      tenantSlug = platformRootMembership.tenant.slug;
    }
  }

  if (!tenantId || !tenantSlug) {
    return null;
  }

  if (userId && !role) {
    const memberships = await prisma.membership.findMany({
      where: {
        userId,
        tenantId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    role = memberships.sort((a, b) => rolePriority(a.role) - rolePriority(b.role))[0]?.role;
  }

  const privileged = Boolean(await readPrivilegedCookie());

  return {
    tenantId,
    tenantSlug,
    host,
    userId: userId ?? undefined,
    role,
    privileged,
  };
}
