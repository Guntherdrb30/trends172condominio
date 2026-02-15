import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GlassHeader } from "@/components/public/glass-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoAmenities } from "@/lib/demo-data";
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

type AmenityPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: AmenityPageProps): Promise<Metadata> {
  const tenantCtx = await getTenantContext();
  const language = await getTenantLanguage();
  const { slug } = await params;
  const amenity =
    (tenantCtx?.tenantId
      ? await prisma.amenityInstance.findFirst({
          where: {
            tenantId: tenantCtx.tenantId,
            slug,
          },
        })
      : null) ?? demoAmenities.find((item) => item.slug === slug);
  if (!amenity) {
    return {
      title: "Amenity no encontrada",
    };
  }
  const translations =
    tenantCtx?.tenantId && "id" in amenity
      ? await getTranslationMap({
          tenantId: tenantCtx.tenantId,
          entityType: "Amenity",
          entityId: amenity.id,
          locale: language.toLowerCase(),
        })
      : new Map<string, string>();
  const title = translations.get("title") ?? amenity.title;
  const description = translations.get("description") ?? amenity.description ?? "";
  return {
    title,
    description,
  };
}

export default async function AmenityPage({ params }: AmenityPageProps) {
  const tenantCtx = await getTenantContext();
  const language = await getTenantLanguage();
  const { slug } = await params;
  const amenity =
    (tenantCtx?.tenantId
      ? await prisma.amenityInstance.findFirst({
          where: {
            tenantId: tenantCtx.tenantId,
            slug,
          },
        })
      : null) ?? demoAmenities.find((item) => item.slug === slug);
  if (!amenity) {
    notFound();
  }
  const translations =
    tenantCtx?.tenantId && "id" in amenity
      ? await getTranslationMap({
          tenantId: tenantCtx.tenantId,
          entityType: "Amenity",
          entityId: amenity.id,
          locale: language.toLowerCase(),
        })
      : new Map<string, string>();
  const title = translations.get("title") ?? amenity.title;
  const description = translations.get("description") ?? amenity.description ?? "";
  const dimensionsM2 = toNumber(amenity.dimensionsM2);

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: title,
    description,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <GlassHeader language={language} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }} />
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-700">
            <p>{description}</p>
            <p>Area total: {dimensionsM2 ?? 0} m2</p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/availability">Explorar unidades</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/root/configurator">Configurar amenity</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
