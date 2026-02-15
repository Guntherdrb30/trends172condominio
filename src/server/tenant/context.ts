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
  const sessionRole = session?.user?.role;
  let tenantId = fallbackDomain?.tenantId;
  let tenantSlug = fallbackDomain?.tenant?.slug;

  if (userId && sessionRole === "ROOT") {
    const platformRootMembership = await prisma.membership.findFirst({
      where: {
        userId,
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
    if (platformRootMembership?.tenant) {
      tenantId = platformRootMembership.tenant.id;
      tenantSlug = platformRootMembership.tenant.slug;
    }
  }

  if (!tenantId || !tenantSlug) {
    return null;
  }

  let role: Role | undefined;
  if (userId) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        tenantId,
        isActive: true,
      },
      select: {
        role: true,
      },
    });
    role = membership?.role;
  }

  const privilegedToken = await readPrivilegedCookie();
  const privileged = Boolean(
    userId && privilegedToken && privilegedToken.userId === userId && privilegedToken.tenantId === tenantId,
  );

  return {
    tenantId,
    tenantSlug,
    host,
    userId: userId ?? undefined,
    role,
    privileged,
  };
}
