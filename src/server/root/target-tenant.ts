import { cookies } from "next/headers";

import { prisma } from "@/server/db";
import { getAuthSession } from "@/server/auth/session";

const ROOT_TARGET_COOKIE = "root_target_tenant";

export type RootTargetTenant = {
  platformTenantId: string;
  targetTenantId: string;
};

type TenantPick = {
  id: string;
  name: string;
  slug: string;
};

async function getPlatformRootMembership(userId: string) {
  return prisma.membership.findFirst({
    where: {
      userId,
      role: "ROOT",
      tenant: {
        OR: [{ type: "PLATFORM" }, { isPlatform: true }],
      },
    },
    select: {
      tenantId: true,
    },
  });
}

export async function getRootCustomerTenants(): Promise<TenantPick[]> {
  return prisma.tenant.findMany({
    where: {
      OR: [{ type: "CUSTOMER" }, { type: null, isPlatform: { not: true } }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: [{ name: "asc" }],
  });
}

export async function getRootTargetTenant(userId?: string): Promise<RootTargetTenant> {
  const sessionUserId = userId ?? (await getAuthSession())?.user?.id;
  if (!sessionUserId) {
    throw new Error("Authenticated ROOT user required.");
  }

  const rootMembership = await getPlatformRootMembership(sessionUserId);
  if (!rootMembership) {
    throw new Error("Platform ROOT membership required.");
  }

  const tenants = await getRootCustomerTenants();
  const cookieStore = await cookies();
  const cookieTenantId = cookieStore.get(ROOT_TARGET_COOKIE)?.value;

  const selected =
    tenants.find((tenant) => tenant.id === cookieTenantId) ??
    tenants[0] ??
    (await prisma.tenant.findUnique({
      where: { id: rootMembership.tenantId },
      select: { id: true, name: true, slug: true },
    }));

  if (!selected) {
    throw new Error("No tenant available for ROOT target selection.");
  }

  return {
    platformTenantId: rootMembership.tenantId,
    targetTenantId: selected.id,
  };
}

export async function setRootTargetTenant(userId: string, targetTenantId: string) {
  const rootMembership = await getPlatformRootMembership(userId);
  if (!rootMembership) {
    throw new Error("Platform ROOT membership required.");
  }

  const targetTenant = await prisma.tenant.findFirst({
    where: {
      id: targetTenantId,
      OR: [{ type: "CUSTOMER" }, { type: null, isPlatform: { not: true } }],
    },
    select: { id: true },
  });

  if (!targetTenant) {
    throw new Error("Invalid target tenant.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ROOT_TARGET_COOKIE, targetTenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function resolveScopedTenantId(input: {
  role?: "CLIENT" | "SELLER" | "ADMIN" | "ROOT";
  tenantId: string;
  userId?: string;
}) {
  if (input.role !== "ROOT") {
    return {
      targetTenantId: input.tenantId,
      platformTenantId: input.tenantId,
    };
  }
  if (!input.userId) {
    throw new Error("Authenticated ROOT user required.");
  }
  return getRootTargetTenant(input.userId);
}
