"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackEventClient } from "@/lib/analytics/track-event";

type UnitDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit:
    | {
        id: string;
        slug: string;
        code: string;
        typologyName: string;
        typologySlug: string;
        areaM2: number;
        price: number;
        view: string;
      }
    | undefined;
};

export function UnitDrawer({ open, onOpenChange, unit }: UnitDrawerProps) {
  const whatsappMessage = useMemo(() => {
    if (!unit) return "";
    return encodeURIComponent(`Hola, me interesa la unidad ${unit.code} (${unit.typologyName}).`);
  }, [unit]);

  if (!unit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{unit.code}</DialogTitle>
          <DialogDescription>
            {unit.typologyName} | {unit.areaM2} m2 | Desde ${unit.price.toLocaleString("en-US")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Resumen</TabsTrigger>
            <TabsTrigger value="tour">Tour 360</TabsTrigger>
            <TabsTrigger value="renders">Renders</TabsTrigger>
            <TabsTrigger value="specs">Specs</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="rounded-lg border border-slate-200 p-4">
            Vista recomendada: {unit.view}. Ideal para inversion o vivienda primaria.
          </TabsContent>
          <TabsContent value="tour" className="rounded-lg border border-slate-200 p-4">
            Accede al recorrido inmersivo con hotspots de materiales y dimensiones.
          </TabsContent>
          <TabsContent value="renders" className="rounded-lg border border-slate-200 p-4">
            Biblioteca visual con interiores, fachadas y brochure descargable.
          </TabsContent>
          <TabsContent value="specs" className="rounded-lg border border-slate-200 p-4">
            Tipologia: {unit.typologyName}. Area: {unit.areaM2} m2. Precio base: ${unit.price.toLocaleString("en-US")}.
          </TabsContent>
        </Tabs>

        <div className="grid gap-2 sm:grid-cols-4">
          <Button
            variant="secondary"
            onClick={() => {
              void trackEventClient({ event: "open_tour_360", path: `/availability?unit=${unit.slug}` });
            }}
          >
            Tour 360
          </Button>
          <Button
            asChild
            onClick={() => {
              void trackEventClient({ event: "schedule_appointment", path: `/availability?unit=${unit.slug}` });
            }}
          >
            <Link href="/app/client">Agendar</Link>
          </Button>
          <Button
            asChild
            onClick={() => {
              void trackEventClient({ event: "start_reservation", path: `/availability?unit=${unit.slug}` });
            }}
          >
            <Link href="/login?next=/availability">Reservar</Link>
          </Button>
          <Button
            variant="outline"
            asChild
            onClick={() => {
              void trackEventClient({ event: "click_whatsapp", path: `/availability?unit=${unit.slug}` });
            }}
          >
            <a href={`https://wa.me/13055550123?text=${whatsappMessage}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
