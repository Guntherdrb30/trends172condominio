"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type HeroItem = {
  typologyId: string;
  typologyName: string;
  tenantName: string;
  areaM2: number | null;
  basePrice: number | null;
  imageUrl: string | null;
  typologyUrl: string;
  sponsored: boolean;
};

function money(value: number | null) {
  if (!value) return "Precio bajo consulta";
  return `$${value.toLocaleString("en-US")}`;
}

export function HeroCarousel({ items }: { items: HeroItem[] }) {
  const [active, setActive] = useState(0);
  const safeItems = useMemo(() => (items.length > 0 ? items : []), [items]);

  useEffect(() => {
    if (safeItems.length < 2) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % safeItems.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [safeItems.length]);

  if (safeItems.length === 0) {
    return (
      <section className="rounded-3xl border border-[#d8c8a8] bg-[#0f172a] p-10 text-[#f8efe2]">
        <p className="text-sm uppercase tracking-[0.22em] text-[#d2b483]">Premium Catalogue</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-6xl">Propiedades destacadas proximamente</h1>
      </section>
    );
  }

  const current = safeItems[active];

  return (
    <section className="relative overflow-hidden rounded-[2.2rem] border border-[#d9c6a6] bg-[#0f172a] shadow-[0_32px_80px_-40px_rgba(15,23,42,.9)]">
      <div className="absolute inset-0">
        {current.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.imageUrl} alt={current.typologyName} className="h-full w-full object-cover opacity-55" />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(6,12,24,.95)_15%,rgba(6,12,24,.75)_45%,rgba(6,12,24,.55)_100%)]" />
      </div>
      <div className="relative z-10 grid gap-6 p-8 md:p-12 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#d7b37d] text-[#1b1307] hover:bg-[#d7b37d]">Top 10 Premium</Badge>
            {current.sponsored ? (
              <Badge className="bg-[#f4e9d4] text-[#382609] hover:bg-[#f4e9d4]">Posicion patrocinada</Badge>
            ) : null}
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#ead8b7]">{current.tenantName}</p>
          <h1 className="font-serif text-4xl leading-tight text-[#fff7ec] md:text-6xl">{current.typologyName}</h1>
          <p className="text-base text-[#f4e6cf] md:text-lg">
            {money(current.basePrice)} {current.areaM2 ? `| ${current.areaM2} m2` : ""}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-[#d7b37d] text-[#1a1308] hover:bg-[#caa166]">
              <a href={current.typologyUrl} target="_blank" rel="noreferrer">
                Ver propiedad
              </a>
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end">
          {safeItems.map((item, index) => (
            <button
              key={item.typologyId}
              type="button"
              onClick={() => setActive(index)}
              className={`h-2.5 rounded-full transition-all ${
                active === index ? "w-10 bg-[#d7b37d]" : "w-2.5 bg-[#f5e8d0]/50 hover:bg-[#f5e8d0]/80"
              }`}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
