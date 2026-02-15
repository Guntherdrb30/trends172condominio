"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CandidateTypology = {
  id: string;
  name: string;
  slug: string;
  areaM2: number | null;
  basePrice: number | null;
  tenantId: string;
  tenantName: string;
  imageUrl: string | null;
};

type CandidateAmenity = {
  id: string;
  title: string;
  slug: string;
  tenantId: string;
  tenantName: string;
  imageUrl: string | null;
};

type SettingsPayload = {
  heroTypologyIds: string[];
  sponsoredHeroTypologyIds: string[];
  amenitySpotIds: string[];
  contactHeadline: string;
  contactBody: string;
  contactCtaLabel: string;
  contactCtaHref: string;
};

function money(value: number | null) {
  if (!value) return "-";
  return `$${value.toLocaleString("en-US")}`;
}

export function RootMarketplaceConsole() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [amenitySearch, setAmenitySearch] = useState("");

  const [candidates, setCandidates] = useState<{ typologies: CandidateTypology[]; amenities: CandidateAmenity[] }>({
    typologies: [],
    amenities: [],
  });
  const [settings, setSettings] = useState<SettingsPayload>({
    heroTypologyIds: [],
    sponsoredHeroTypologyIds: [],
    amenitySpotIds: [],
    contactHeadline: "Contactanos para publicar tu proyecto premium",
    contactBody: "Impulsa ventas, inventario y cobros en un solo sistema para propiedades de alto valor.",
    contactCtaLabel: "Quiero vender con Condo Sales OS",
    contactCtaHref: "/login",
  });

  const heroSet = useMemo(() => new Set(settings.heroTypologyIds), [settings.heroTypologyIds]);
  const sponsoredSet = useMemo(() => new Set(settings.sponsoredHeroTypologyIds), [settings.sponsoredHeroTypologyIds]);
  const amenitySet = useMemo(() => new Set(settings.amenitySpotIds), [settings.amenitySpotIds]);

  const filteredTypologies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates.typologies;
    return candidates.typologies.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.tenantName.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q),
    );
  }, [candidates.typologies, search]);

  const filteredAmenities = useMemo(() => {
    const q = amenitySearch.trim().toLowerCase();
    if (!q) return candidates.amenities;
    return candidates.amenities.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.tenantName.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q),
    );
  }, [amenitySearch, candidates.amenities]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/root/marketplace/settings");
        const data = (await response.json()) as {
          error?: string;
          settings?: SettingsPayload;
          candidates?: { typologies: CandidateTypology[]; amenities: CandidateAmenity[] };
        };
        if (!response.ok || !data.settings || !data.candidates) {
          throw new Error(data.error ?? "No se pudo cargar configuracion");
        }
        setSettings(data.settings);
        setCandidates(data.candidates);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Error cargando marketplace");
      }
    })();
  }, []);

  function toggleHero(typologyId: string) {
    setSettings((prev) => {
      const exists = prev.heroTypologyIds.includes(typologyId);
      if (exists) {
        return {
          ...prev,
          heroTypologyIds: prev.heroTypologyIds.filter((id) => id !== typologyId),
          sponsoredHeroTypologyIds: prev.sponsoredHeroTypologyIds.filter((id) => id !== typologyId),
        };
      }
      if (prev.heroTypologyIds.length >= 10) return prev;
      return {
        ...prev,
        heroTypologyIds: [...prev.heroTypologyIds, typologyId],
      };
    });
  }

  function toggleSponsored(typologyId: string) {
    setSettings((prev) => {
      if (!prev.heroTypologyIds.includes(typologyId)) return prev;
      const exists = prev.sponsoredHeroTypologyIds.includes(typologyId);
      return {
        ...prev,
        sponsoredHeroTypologyIds: exists
          ? prev.sponsoredHeroTypologyIds.filter((id) => id !== typologyId)
          : [...prev.sponsoredHeroTypologyIds, typologyId],
      };
    });
  }

  function moveHero(typologyId: string, direction: "up" | "down") {
    setSettings((prev) => {
      const index = prev.heroTypologyIds.indexOf(typologyId);
      if (index === -1) return prev;
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= prev.heroTypologyIds.length) return prev;
      const next = [...prev.heroTypologyIds];
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return { ...prev, heroTypologyIds: next };
    });
  }

  function toggleAmenity(amenityId: string) {
    setSettings((prev) => {
      const exists = prev.amenitySpotIds.includes(amenityId);
      if (exists) {
        return {
          ...prev,
          amenitySpotIds: prev.amenitySpotIds.filter((id) => id !== amenityId),
        };
      }
      if (prev.amenitySpotIds.length >= 6) return prev;
      return {
        ...prev,
        amenitySpotIds: [...prev.amenitySpotIds, amenityId],
      };
    });
  }

  async function save() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/root/marketplace/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar");
      }
      setStatus("Configuracion marketplace guardada.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Error guardando");
    } finally {
      setLoading(false);
    }
  }

  const heroSelectedRows = settings.heroTypologyIds
    .map((id) => candidates.typologies.find((row) => row.id === id))
    .filter((row): row is CandidateTypology => Boolean(row));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Marketplace Premium Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Titular contacto"
            value={settings.contactHeadline}
            onChange={(e) => setSettings((prev) => ({ ...prev, contactHeadline: e.target.value }))}
          />
          <Input
            placeholder="Texto boton contacto"
            value={settings.contactCtaLabel}
            onChange={(e) => setSettings((prev) => ({ ...prev, contactCtaLabel: e.target.value }))}
          />
          <Input
            className="md:col-span-2"
            placeholder="Descripcion contacto"
            value={settings.contactBody}
            onChange={(e) => setSettings((prev) => ({ ...prev, contactBody: e.target.value }))}
          />
          <Input
            className="md:col-span-2"
            placeholder="Link contacto (/login o URL externa)"
            value={settings.contactCtaHref}
            onChange={(e) => setSettings((prev) => ({ ...prev, contactCtaHref: e.target.value }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Propiedades a mostrar en hero (max 10)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Buscar tipologia..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="max-h-[460px] space-y-2 overflow-auto rounded-md border border-slate-200 p-2">
              {filteredTypologies.map((item) => {
                const selected = heroSet.has(item.id);
                const sponsored = sponsoredSet.has(item.id);
                return (
                  <div key={item.id} className="rounded-md border border-slate-200 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {item.name} <span className="text-slate-500">- {item.tenantName}</span>
                      </p>
                      <div className="flex gap-1">
                        <Button size="sm" variant={selected ? "default" : "outline"} onClick={() => toggleHero(item.id)}>
                          {selected ? "En hero" : "Agregar"}
                        </Button>
                        <Button
                          size="sm"
                          variant={sponsored ? "secondary" : "outline"}
                          onClick={() => toggleSponsored(item.id)}
                          disabled={!selected}
                        >
                          Patrocinada
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {item.areaM2 ? `${item.areaM2} m2` : "-"} | {money(item.basePrice)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orden hero y posiciones patrocinadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {heroSelectedRows.length === 0 ? <p className="text-sm text-slate-600">No hay propiedades seleccionadas.</p> : null}
            {heroSelectedRows.map((item, index) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">#{index + 1}</Badge>
                  <p className="text-sm">
                    {item.name} <span className="text-slate-500">({item.tenantName})</span>
                  </p>
                  {sponsoredSet.has(item.id) ? <Badge variant="warning">Patrocinada</Badge> : null}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => moveHero(item.id, "up")}>
                    Subir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => moveHero(item.id, "down")}>
                    Bajar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Amenidades destacadas patrocinadas (max 6)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Buscar amenidad..."
            value={amenitySearch}
            onChange={(e) => setAmenitySearch(e.target.value)}
          />
          <div className="grid gap-2 md:grid-cols-2">
            {filteredAmenities.map((item) => {
              const selected = amenitySet.has(item.id);
              return (
                <div key={item.id} className="flex items-center justify-between rounded-md border border-slate-200 p-2">
                  <p className="text-sm">
                    {item.title} <span className="text-slate-500">- {item.tenantName}</span>
                  </p>
                  <Button size="sm" variant={selected ? "default" : "outline"} onClick={() => toggleAmenity(item.id)}>
                    {selected ? "Destacada" : "Agregar"}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{status || "Configura que propiedades aparecen en el home premium."}</p>
        <Button onClick={() => void save()} disabled={loading}>
          {loading ? "Guardando..." : "Guardar configuracion"}
        </Button>
      </div>
    </div>
  );
}
