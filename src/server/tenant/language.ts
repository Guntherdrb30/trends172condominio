import { prisma } from "@/server/db";
import { getTenantContext } from "@/server/tenant/context";
import { type AppLanguage, normalizeLanguage } from "@/lib/i18n";

export async function getTenantLanguage(): Promise<AppLanguage> {
  try {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx?.tenantId) {
      return "ES";
    }

    const tenant = await prisma.tenant.findUnique({
      where: {
        id: tenantCtx.tenantId,
      },
      select: {
        defaultLanguage: true,
      },
    });

    return normalizeLanguage(tenant?.defaultLanguage);
  } catch {
    return "ES";
  }
}
