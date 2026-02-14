import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageEvent } from "@/components/analytics/page-event";
import { GlassHeader } from "@/components/public/glass-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoTypologies } from "@/lib/demo-data";
import { getTenantLanguage } from "@/server/tenant/language";

type TypologyPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: TypologyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const typology = demoTypologies.find((item) => item.slug === slug);
  if (!typology) {
    return {
      title: "Tipologia no encontrada",
    };
  }
  return {
    title: typology.name,
    description: typology.description,
    openGraph: {
      title: typology.name,
      description: typology.description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: typology.name,
      description: typology.description,
    },
  };
}

export default async function TypologyPage({ params }: TypologyPageProps) {
  const language = await getTenantLanguage();
  const { slug } = await params;
  const typology = demoTypologies.find((item) => item.slug === slug);
  if (!typology) {
    notFound();
  }

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: typology.name,
    description: typology.description,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: typology.basePrice,
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
            <CardTitle className="text-3xl">{typology.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-700">
            <p>{typology.description}</p>
            <p>Area: {typology.areaM2} m2</p>
            <p>Dormitorios: {typology.bedrooms}</p>
            <p>Banos: {typology.bathrooms}</p>
            <p>Precio desde: ${typology.basePrice.toLocaleString("en-US")}</p>
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
