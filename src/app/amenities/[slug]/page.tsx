import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GlassHeader } from "@/components/public/glass-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoAmenities } from "@/lib/demo-data";
import { getTenantLanguage } from "@/server/tenant/language";

type AmenityPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: AmenityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const amenity = demoAmenities.find((item) => item.slug === slug);
  if (!amenity) {
    return {
      title: "Amenity no encontrada",
    };
  }
  return {
    title: amenity.title,
    description: amenity.description,
  };
}

export default async function AmenityPage({ params }: AmenityPageProps) {
  const language = await getTenantLanguage();
  const { slug } = await params;
  const amenity = demoAmenities.find((item) => item.slug === slug);
  if (!amenity) {
    notFound();
  }

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: amenity.title,
    description: amenity.description,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <GlassHeader language={language} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }} />
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{amenity.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-700">
            <p>{amenity.description}</p>
            <p>Area total: {amenity.dimensionsM2} m2</p>
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
