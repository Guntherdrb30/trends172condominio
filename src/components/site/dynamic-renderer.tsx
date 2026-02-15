import Link from "next/link";

import { PlanCanvas } from "@/components/masterplan/plan-canvas";
import { PageEvent } from "@/components/analytics/page-event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UnitShape = {
  id: string;
  slug: string;
  code: string;
  typologyName: string;
  typologySlug: string;
  areaM2: number;
  price: number;
  floor: number;
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";
  polygon: string;
  view: string;
};

type DynamicRendererProps = {
  sections: unknown;
  units?: UnitShape[];
};

type SectionItem = {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
};

function asSections(value: unknown): SectionItem[] {
  return Array.isArray(value) ? (value as SectionItem[]) : [];
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asItems(value: unknown): Array<{ title?: string; body?: string }> {
  return Array.isArray(value) ? (value as Array<{ title?: string; body?: string }>) : [];
}

export function DynamicRenderer({ sections, units = [] }: DynamicRendererProps) {
  const blocks = asSections(sections);
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        const key = block.id ?? `block-${index}`;
        const props = block.props ?? {};

        if (block.type === "hero") {
          return (
            <section
              key={key}
              className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h1 className="text-3xl font-semibold text-slate-900 md:text-5xl">
                {asText(props.title, "Condo Sales OS")}
              </h1>
              <p className="mt-3 max-w-2xl text-slate-600">{asText(props.subtitle)}</p>
              <div className="mt-5">
                <Button asChild>
                  <Link href={asText(props.ctaHref, "/availability")}>
                    {asText(props.ctaLabel, "Ver disponibilidad")}
                  </Link>
                </Button>
              </div>
            </section>
          );
        }

        if (block.type === "cards") {
          const cards = asItems(props.items);
          return (
            <section key={key} className="grid gap-4 md:grid-cols-3">
              {cards.map((item, cardIndex) => (
                <Card key={`${key}-${cardIndex}`}>
                  <CardHeader>
                    <CardTitle>{item.title ?? `Card ${cardIndex + 1}`}</CardTitle>
                  </CardHeader>
                  <CardContent>{item.body ?? ""}</CardContent>
                </Card>
              ))}
            </section>
          );
        }

        if (block.type === "masterplan") {
          return (
            <section key={key} className="space-y-2">
              <PageEvent event="open_masterplan" path="/availability" />
              <h2 className="text-2xl font-semibold text-slate-900">
                {asText(props.title, "Masterplan interactivo")}
              </h2>
              <PlanCanvas units={units} />
            </section>
          );
        }

        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle>{asText(props.title, block.type ?? "Bloque")}</CardTitle>
            </CardHeader>
            <CardContent>{asText(props.body, "")}</CardContent>
          </Card>
        );
      })}
    </div>
  );
}

