import Link from "next/link";

import { PageEvent } from "@/components/analytics/page-event";
import { GlassHeader } from "@/components/public/glass-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoAmenities, demoTenant, demoTypologies } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n";
import { getTenantLanguage } from "@/server/tenant/language";

export const dynamic = "force-dynamic";

export default async function Home() {
  const language = await getTenantLanguage();
  const t = getDictionary(language);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Como funciona la reserva digital?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "El cliente inicia sesion, selecciona unidad y crea reserva con expiracion configurable por tenant.",
        },
      },
      {
        "@type": "Question",
        name: "Como accedo a contratos y vouchers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Todos los documentos se entregan solo por signed URLs de corta duracion.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#dbeafe_0%,#eff6ff_35%,#f8fafc_80%)]">
      <PageEvent event="view_home" path="/" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <GlassHeader language={language} />
      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <section className="grid gap-8 py-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <Badge variant="secondary">{t.homeBadge}</Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl">
              {t.homeTitle}
            </h1>
            <p className="max-w-2xl text-base text-slate-700 md:text-lg">
              {demoTenant.seoDescription}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/availability">{t.openMasterplan}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/app/admin">{t.goDashboard}</Link>
              </Button>
            </div>
          </div>
          <Card className="overflow-hidden border-slate-300 bg-white/75 backdrop-blur">
            <CardHeader>
              <CardTitle>{t.activeFunnelToday}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <div className="rounded-lg bg-slate-100 p-3">{t.visitsHome}: 1,200</div>
              <div className="rounded-lg bg-slate-100 p-3">{t.unitViews}: 640</div>
              <div className="rounded-lg bg-slate-100 p-3">{t.reservationsStarted}: 118</div>
              <div className="rounded-lg bg-slate-100 p-3">{t.reservationsCompleted}: 42</div>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          {demoTypologies.map((typology) => (
            <Card key={typology.id}>
              <CardHeader>
                <CardTitle>{typology.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                <p>{typology.description}</p>
                <p>Area: {typology.areaM2} m2</p>
                <p>Desde ${typology.basePrice.toLocaleString("en-US")}</p>
                <Button asChild size="sm">
                  <Link href={`/typologies/${typology.slug}`}>{t.viewTypology}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {demoAmenities.map((amenity) => (
            <Card key={amenity.slug}>
              <CardHeader>
                <CardTitle>{amenity.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                <p>{amenity.description}</p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/amenities/${amenity.slug}`}>{t.configureAmenity}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
