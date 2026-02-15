import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageEvent } from "@/components/analytics/page-event";
import { GlassHeader } from "@/components/public/glass-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoTypologies } from "@/lib/demo-data";
import { prisma } from "@/server/db";
import { getTranslationMap } from "@/server/services/translation.service";
import { getTenantContext } from "@/server/tenant/context";
import { getTenantLanguage } from "@/server/tenant/language";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return null;
}

type TypologyPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: TypologyPageProps): Promise<Metadata> {
  const tenantCtx = await getTenantContext();
  const language = await getTenantLanguage();
  const { slug } = await params;
  const typology =
    (tenantCtx?.tenantId
      ? await prisma.typology.findFirst({
          where: {
            tenantId: tenantCtx.tenantId,
            slug,
          },
        })
      : null) ?? demoTypologies.find((item) => item.slug === slug);
  if (!typology) {
    return {
      title: "Tipologia no encontrada",
    };
  }
  const translations =
    tenantCtx?.tenantId && "id" in typology
      ? await getTranslationMap({
          tenantId: tenantCtx.tenantId,
          entityType: "Typology",
          entityId: typology.id,
          locale: language.toLowerCase(),
        })
      : new Map<string, string>();
  const title = translations.get("name") ?? typology.name;
  const description = translations.get("description") ?? typology.description ?? "";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function TypologyPage({ params }: TypologyPageProps) {
  const tenantCtx = await getTenantContext();
  const language = await getTenantLanguage();
  const { slug } = await params;
  const typology =
    (tenantCtx?.tenantId
      ? await prisma.typology.findFirst({
          where: {
            tenantId: tenantCtx.tenantId,
            slug,
          },
        })
      : null) ?? demoTypologies.find((item) => item.slug === slug);
  if (!typology) {
    notFound();
  }
  const translations =
    tenantCtx?.tenantId && "id" in typology
      ? await getTranslationMap({
          tenantId: tenantCtx.tenantId,
          entityType: "Typology",
          entityId: typology.id,
          locale: language.toLowerCase(),
        })
      : new Map<string, string>();
  const title = translations.get("name") ?? typology.name;
  const description = translations.get("description") ?? typology.description ?? "";
  const areaM2 = toNumber(typology.areaM2);
  const basePrice = toNumber(typology.basePrice);
  const bedrooms = typeof typology.bedrooms === "number" ? typology.bedrooms : 0;
  const bathrooms = typeof typology.bathrooms === "number" ? typology.bathrooms : 0;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: basePrice ?? 0,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageEvent event="view_typology" path={`/typologies/${typology.slug}`} />
      <GlassHeader language={language} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-700">
            <p>{description}</p>
            <p>Area: {areaM2 ?? 0} m2</p>
            <p>Dormitorios: {bedrooms}</p>
            <p>Banos: {bathrooms}</p>
            <p>Precio desde: ${(basePrice ?? 0).toLocaleString("en-US")}</p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/availability">Ver unidades disponibles</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/client">Agendar visita</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
