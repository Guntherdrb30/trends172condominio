import Link from "next/link";

import { Button } from "@/components/ui/button";
import { type AppLanguage, getDictionary } from "@/lib/i18n";
import { prisma } from "@/server/db";
import { getTenantContext } from "@/server/tenant/context";

type NavItem = {
  label: string;
  href: string;
};

function normalizeNav(items: unknown): NavItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { label?: unknown; href?: unknown };
      if (typeof row.label !== "string" || typeof row.href !== "string") return null;
      return {
        label: row.label,
        href: row.href,
      };
    })
    .filter((item): item is NavItem => Boolean(item));
}

export async function GlassHeader({ language = "ES" }: { language?: AppLanguage }) {
  const t = getDictionary(language);
  const tenantCtx = await getTenantContext();

  const [tenant, navigation] = tenantCtx?.tenantId
    ? await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantCtx.tenantId },
          select: { name: true, type: true, isPlatform: true },
        }),
        prisma.siteNavigation.findUnique({
          where: {
            tenantId_locale: {
              tenantId: tenantCtx.tenantId,
              locale: language.toLowerCase(),
            },
          },
          select: {
            publishedItems: true,
          },
        }),
      ])
    : [null, null];

  const navItems = normalizeNav(navigation?.publishedItems);
  const isPlatformMode = Boolean(tenant?.type === "PLATFORM" || tenant?.isPlatform);
  const fallbackNav: NavItem[] = isPlatformMode
    ? [
        { href: "/#projects", label: "Proyectos" },
        { href: "/#amenity-spots", label: "Amenidades" },
        { href: "/#partners", label: "Contactanos" },
      ]
    : [
        { href: "/availability", label: t.navMasterplan },
        { href: "/typologies/aurora-2br", label: t.navTypologies },
        { href: "/amenities/sky-lounge", label: t.navAmenities },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/20 bg-white/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          {tenant?.name ?? t.brandName}
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-700 md:flex">
          {(navItems.length > 0 ? navItems : fallbackNav).map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Button asChild size="sm">
          <Link href="/login">{t.signIn}</Link>
        </Button>
      </div>
    </header>
  );
}
