import type { Metadata } from "next";

import { PageEvent } from "@/components/analytics/page-event";
import { PlanCanvas } from "@/components/masterplan/plan-canvas";
import { GlassHeader } from "@/components/public/glass-header";
import { DynamicRenderer } from "@/components/site/dynamic-renderer";
import { demoUnits } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n";
import { prisma } from "@/server/db";
import { getPublishedPage } from "@/server/services/site-builder.service";
import { getTenantContext } from "@/server/tenant/context";
import { getTenantLanguage } from "@/server/tenant/language";

export const metadata: Metadata = {
  title: "Availability Masterplan",
  description: "Mapa interactivo con estado de unidades y filtros avanzados.",
};

export const dynamic = "force-dynamic";

function fallbackPolygon(index: number) {
  const col = index % 5;
  const row = Math.floor(index / 5);
  const x = 8 + col * 17;
  const y = 10 + row * 16;
  return `${x},${y} ${x + 12},${y} ${x + 11},${y + 9} ${x - 1},${y + 9}`;
}

function normalizePolygon(value: unknown, index: number) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (
    Array.isArray(value) &&
    value.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === "number" &&
        typeof point[1] === "number",
    )
  ) {
    return value.map((point) => `${point[0]},${point[1]}`).join(" ");
  }
  return fallbackPolygon(index);
}

export default async function AvailabilityPage() {
  const tenantCtx = await getTenantContext();
  const language = await getTenantLanguage();
  const t = getDictionary(language);
  const publishedAvailability = tenantCtx?.tenantId
    ? await getPublishedPage({
        tenantId: tenantCtx.tenantId,
        slug: "availability",
        locale: language.toLowerCase(),
      })
    : null;

  const unitsFromDb = tenantCtx?.tenantId
    ? await prisma.unit.findMany({
        where: {
          tenantId: tenantCtx.tenantId,
        },
        include: {
          typology: true,
          floor: true,
        },
        orderBy: [{ code: "asc" }],
        take: 200,
      })
    : [];

  const canvasUnits =
    unitsFromDb.length > 0
      ? unitsFromDb.map((unit, index) => ({
          id: unit.id,
          slug: unit.slug,
          code: unit.code,
          typologyName: unit.typology.name,
          typologySlug: unit.typology.slug,
          areaM2: Number(unit.areaM2),
          price: Number(unit.price),
          floor: unit.floor.number,
          status: unit.status,
          polygon: normalizePolygon(unit.geoPolygon, index),
          view: unit.view ?? "Default",
        }))
      : demoUnits;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageEvent event="view_unit" path="/availability" />
      <GlassHeader language={language} />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t.interactiveMasterplan}</h1>
          <p className="text-sm text-slate-600">
            {t.masterplanDescription}
          </p>
        </header>
        {publishedAvailability?.version?.sections ? (
          <DynamicRenderer sections={publishedAvailability.version.sections} units={canvasUnits} />
        ) : (
          <PlanCanvas units={canvasUnits} />
        )}
      </main>
    </div>
  );
}
