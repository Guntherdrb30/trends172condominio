import Link from "next/link";

import { Button } from "@/components/ui/button";

export function GlassHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/20 bg-white/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          Condo Sales OS
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-700 md:flex">
          <Link href="/availability">Masterplan</Link>
          <Link href="/typologies/aurora-2br">Tipologias</Link>
          <Link href="/amenities/sky-lounge">Amenities</Link>
        </nav>
        <Button asChild size="sm">
          <Link href="/login">Ingresar</Link>
        </Button>
      </div>
    </header>
  );
}

