import type { Metadata } from "next";

import { PageEvent } from "@/components/analytics/page-event";
import { PlanCanvas } from "@/components/masterplan/plan-canvas";
import { GlassHeader } from "@/components/public/glass-header";
import { demoUnits } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n";
import { getTenantLanguage } from "@/server/tenant/language";

export const metadata: Metadata = {
  title: "Availability Masterplan",
  description: "Mapa interactivo con estado de unidades y filtros avanzados.",
};

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const language = await getTenantLanguage();
  const t = getDictionary(language);

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
        <PlanCanvas units={demoUnits} />
      </main>
    </div>
  );
}
