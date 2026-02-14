import Link from "next/link";

import { Button } from "@/components/ui/button";
import { type AppLanguage, getDictionary } from "@/lib/i18n";

export function GlassHeader({ language = "ES" }: { language?: AppLanguage }) {
  const t = getDictionary(language);

  return (
    <header className="sticky top-0 z-40 border-b border-white/20 bg-white/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          {t.brandName}
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-700 md:flex">
          <Link href="/availability">{t.navMasterplan}</Link>
          <Link href="/typologies/aurora-2br">{t.navTypologies}</Link>
          <Link href="/amenities/sky-lounge">{t.navAmenities}</Link>
        </nav>
        <Button asChild size="sm">
          <Link href="/login">{t.signIn}</Link>
        </Button>
      </div>
    </header>
  );
}
