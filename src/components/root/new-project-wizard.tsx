"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PropertyKind = "CONDOMINIUM" | "RESIDENTIAL" | "COMMERCIAL" | "MIXED";
type InventoryMode = "APARTMENTS" | "HOUSES" | "COMMERCIAL_UNITS" | "MIXED";
type OperationModel = "FOR_SALE" | "FOR_RENT" | "MIXED";
type Language = "ES" | "EN" | "PT";
type Locale = "es" | "en" | "pt";

type DistributionItem = {
  name: string;
  category: "APARTMENT" | "HOUSE" | "COMMERCIAL_LOCAL" | "OFFICE" | "PARKING" | "STORAGE" | "OTHER";
  description: string;
  bedrooms: number;
  bathrooms: number;
  parkingSpots: number;
  areaM2: number;
  basePrice: number;
  quantity: number;
};

type AmenityItem = {
  name: string;
  category: "GYM" | "SOCIAL_AREA" | "BBQ" | "POOL" | "COWORK" | "KIDS" | "SPORT" | "PARKING" | "COMMERCIAL" | "OTHER";
  description: string;
  sizeM2: number;
};

type WizardStep = 1 | 2 | 3 | 4;

const emptyDistribution: DistributionItem = {
  name: "",
  category: "APARTMENT",
  description: "",
  bedrooms: 2,
  bathrooms: 2,
  parkingSpots: 1,
  areaM2: 85,
  basePrice: 180000,
  quantity: 10,
};

const emptyAmenity: AmenityItem = {
  name: "",
  category: "SOCIAL_AREA",
  description: "",
  sizeM2: 80,
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function NewProjectWizard() {
  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [propertyKind, setPropertyKind] = useState<PropertyKind>("CONDOMINIUM");
  const [inventoryMode, setInventoryMode] = useState<InventoryMode>("APARTMENTS");
  const [operationModel, setOperationModel] = useState<OperationModel>("FOR_SALE");
  const [totalUnits, setTotalUnits] = useState(20);
  const [totalFloors, setTotalFloors] = useState(8);
  const [towerCount, setTowerCount] = useState(1);
  const [lotAreaM2, setLotAreaM2] = useState<number>(0);
  const [builtAreaM2, setBuiltAreaM2] = useState<number>(0);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [domainHost, setDomainHost] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [heroVideoUrl, setHeroVideoUrl] = useState("");
  const [heroImagesRaw, setHeroImagesRaw] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0f172a");
  const [secondaryColor, setSecondaryColor] = useState("#0ea5e9");
  const [defaultLanguage, setDefaultLanguage] = useState<Language>("ES");
  const [supportedLocales, setSupportedLocales] = useState<Locale[]>(["es", "en"]);
  const [selfSignupEnabled, setSelfSignupEnabled] = useState(true);
  const [reservationTtlHours, setReservationTtlHours] = useState(48);
  const [sellerCommissionPct, setSellerCommissionPct] = useState(3);
  const [platformFeePct, setPlatformFeePct] = useState(2);

  const [distributions, setDistributions] = useState<DistributionItem[]>([{ ...emptyDistribution }]);
  const [amenities, setAmenities] = useState<AmenityItem[]>([
    { name: "Gimnasio", category: "GYM", description: "Equipamiento completo", sizeM2: 140 },
  ]);

  const [brief, setBrief] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [lastAdvice, setLastAdvice] = useState<string[]>([]);
  const [createdTenant, setCreatedTenant] = useState<{ id: string; slug: string } | null>(null);

  const plannedUnits = useMemo(
    () => distributions.reduce((acc, row) => acc + (Number.isFinite(row.quantity) ? row.quantity : 0), 0),
    [distributions],
  );

  function setLocaleEnabled(locale: Locale, enabled: boolean) {
    setSupportedLocales((prev) => {
      const next = new Set(prev);
      if (enabled) {
        next.add(locale);
      } else {
        next.delete(locale);
      }
      if (next.size === 0) {
        next.add("es");
      }
      return [...next];
    });
  }

  function updateDistribution(index: number, patch: Partial<DistributionItem>) {
    setDistributions((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  }

  function updateAmenity(index: number, patch: Partial<AmenityItem>) {
    setAmenities((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  }

  async function askAssistant() {
    if (!brief.trim()) {
      setStatus("Escribe un brief para el asistente.");
      return;
    }
    setAiLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/root/projects/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const data = (await response.json()) as {
        error?: string;
        suggestion?: {
          name: string;
          slug: string;
          description: string;
          propertyKind: PropertyKind;
          inventoryMode: InventoryMode;
          operationModel: OperationModel;
          totalUnits: number;
          totalFloors: number;
          towerCount: number;
          unitDistributions: DistributionItem[];
          amenities: AmenityItem[];
          recommendations: string[];
        };
      };
      if (!response.ok || !data.suggestion) {
        throw new Error(data.error ?? "No se pudo generar sugerencia");
      }
      const suggestion = data.suggestion;
      setName(suggestion.name);
      setSlug(suggestion.slug);
      setDescription(suggestion.description);
      setPropertyKind(suggestion.propertyKind);
      setInventoryMode(suggestion.inventoryMode);
      setOperationModel(suggestion.operationModel);
      setTotalUnits(suggestion.totalUnits);
      setTotalFloors(suggestion.totalFloors);
      setTowerCount(suggestion.towerCount);
      setDistributions(suggestion.unitDistributions);
      setAmenities(suggestion.amenities);
      setLastAdvice(suggestion.recommendations);
      setStatus("Sugerencia IA aplicada. Revisa y ajusta antes de crear.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Error con asistente");
    } finally {
      setAiLoading(false);
    }
  }

  async function createProject() {
    if (!name.trim()) {
      setStatus("El nombre del proyecto es obligatorio.");
      setStep(1);
      return;
    }
    if (distributions.length === 0 || distributions.some((item) => !item.name.trim())) {
      setStatus("Define al menos una distribucion valida.");
      setStep(2);
      return;
    }

    setLoading(true);
    setStatus("");
    try {
      const payload = {
        name: name.trim(),
        slug: (slug.trim() || toSlug(name)).slice(0, 120),
        description: description.trim() || undefined,
        propertyKind,
        inventoryMode,
        operationModel,
        totalUnits,
        totalFloors,
        towerCount,
        lotAreaM2: lotAreaM2 > 0 ? lotAreaM2 : undefined,
        builtAreaM2: builtAreaM2 > 0 ? builtAreaM2 : undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        heroImages: heroImagesRaw
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        heroVideoUrl: heroVideoUrl.trim() || undefined,
        primaryColor: primaryColor.trim() || undefined,
        secondaryColor: secondaryColor.trim() || undefined,
        defaultLanguage,
        supportedLocales,
        domainHost: domainHost.trim() || undefined,
        selfSignupEnabled,
        reservationTtlHours,
        sellerCommissionPct,
        platformFeePct,
        unitDistributions: distributions.map((row) => ({
          ...row,
          name: row.name.trim(),
          description: row.description.trim() || undefined,
        })),
        amenities: amenities
          .filter((row) => row.name.trim())
          .map((row) => ({
            ...row,
            name: row.name.trim(),
            description: row.description.trim() || undefined,
            sizeM2: row.sizeM2 > 0 ? row.sizeM2 : undefined,
          })),
      };

      const response = await fetch("/api/root/projects/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        error?: string;
        tenantId?: string;
        tenantSlug?: string;
        warning?: string | null;
      };
      if (!response.ok || !data.tenantId || !data.tenantSlug) {
        throw new Error(data.error ?? "No se pudo crear el proyecto");
      }
      setCreatedTenant({ id: data.tenantId, slug: data.tenantSlug });
      setStatus(
        data.warning
          ? `Proyecto creado. ${data.warning}`
          : "Proyecto creado correctamente. Ya quedo seleccionado como tenant objetivo.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Error creando proyecto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <Card className="border-slate-300 bg-gradient-to-r from-slate-950 to-slate-800 text-white">
        <CardHeader>
          <CardTitle>Nuevo Proyecto de Condominio / Residencial / Comercial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-200">
            Completa el wizard y el sistema creara tenant, inventario base, amenidades, paginas publicas y configuracion inicial.
          </p>
          <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
            <textarea
              className="min-h-24 rounded-md border border-slate-500 bg-slate-900/70 p-3 text-sm text-slate-100"
              placeholder="Describe tu proyecto para que el asistente IA te sugiera estructura completa..."
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
            />
            <Button onClick={() => void askAssistant()} disabled={aiLoading} className="h-full min-h-24">
              {aiLoading ? "Analizando..." : "Autocompletar con IA"}
            </Button>
          </div>
          {lastAdvice.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {lastAdvice.map((tip) => (
                <Badge key={tip} variant="secondary" className="bg-slate-200 text-slate-800">
                  {tip}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[220px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Pasos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[
              { id: 1, label: "1. Datos generales" },
              { id: 2, label: "2. Tipologias y unidades" },
              { id: 3, label: "3. Amenidades y areas" },
              { id: 4, label: "4. Revision y creacion" },
            ].map((item) => (
              <Button
                key={item.id}
                variant={step === item.id ? "default" : "outline"}
                onClick={() => setStep(item.id as WizardStep)}
              >
                {item.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <section className="space-y-4">
          {step === 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>Datos Generales del Proyecto</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input placeholder="Nombre del proyecto" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input placeholder="Slug (opcional)" value={slug} onChange={(e) => setSlug(e.target.value)} />
                </div>
                <textarea
                  className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Descripcion comercial y de producto"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={propertyKind}
                    onChange={(e) => setPropertyKind(e.target.value as PropertyKind)}
                  >
                    <option value="CONDOMINIUM">Condominio</option>
                    <option value="RESIDENTIAL">Residencial</option>
                    <option value="COMMERCIAL">Comercial</option>
                    <option value="MIXED">Mixto</option>
                  </select>
                  <select
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={inventoryMode}
                    onChange={(e) => setInventoryMode(e.target.value as InventoryMode)}
                  >
                    <option value="APARTMENTS">Apartamentos</option>
                    <option value="HOUSES">Viviendas</option>
                    <option value="COMMERCIAL_UNITS">Locales comerciales</option>
                    <option value="MIXED">Mixto</option>
                  </select>
                  <select
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={operationModel}
                    onChange={(e) => setOperationModel(e.target.value as OperationModel)}
                  >
                    <option value="FOR_SALE">Venta</option>
                    <option value="FOR_RENT">Renta</option>
                    <option value="MIXED">Mixto</option>
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    type="number"
                    placeholder="Total unidades plan"
                    value={totalUnits}
                    onChange={(e) => setTotalUnits(Number(e.target.value))}
                  />
                  <Input
                    type="number"
                    placeholder="Cantidad de pisos"
                    value={totalFloors}
                    onChange={(e) => setTotalFloors(Number(e.target.value))}
                  />
                  <Input
                    type="number"
                    placeholder="Cantidad de torres"
                    value={towerCount}
                    onChange={(e) => setTowerCount(Number(e.target.value))}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input type="number" placeholder="Area de terreno m2" value={lotAreaM2} onChange={(e) => setLotAreaM2(Number(e.target.value))} />
                  <Input type="number" placeholder="Area construida m2" value={builtAreaM2} onChange={(e) => setBuiltAreaM2(Number(e.target.value))} />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input placeholder="Direccion" value={address} onChange={(e) => setAddress(e.target.value)} />
                  <Input placeholder="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} />
                  <Input placeholder="Pais" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input placeholder="Dominio (ej: proyecto.tudominio.com)" value={domainHost} onChange={(e) => setDomainHost(e.target.value)} />
                  <Input placeholder="Logo URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input placeholder="Video recorrido URL" value={heroVideoUrl} onChange={(e) => setHeroVideoUrl(e.target.value)} />
                  <textarea
                    className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Imagenes principales URL (1 por linea)"
                    value={heroImagesRaw}
                    onChange={(e) => setHeroImagesRaw(e.target.value)}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input placeholder="Color primario" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                  <Input placeholder="Color secundario" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
                  <select
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value as Language)}
                  >
                    <option value="ES">ES</option>
                    <option value="EN">EN</option>
                    <option value="PT">PT</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {(["es", "en", "pt"] as const).map((locale) => (
                    <label key={locale} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={supportedLocales.includes(locale)}
                        onChange={(e) => setLocaleEnabled(locale, e.target.checked)}
                      />
                      {locale.toUpperCase()}
                    </label>
                  ))}
                  <label className="ml-4 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selfSignupEnabled} onChange={(e) => setSelfSignupEnabled(e.target.checked)} />
                    Permitir auto-registro CLIENT
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    type="number"
                    placeholder="TTL reservacion (horas)"
                    value={reservationTtlHours}
                    onChange={(e) => setReservationTtlHours(Number(e.target.value))}
                  />
                  <Input
                    type="number"
                    placeholder="Comision vendedor %"
                    value={sellerCommissionPct}
                    onChange={(e) => setSellerCommissionPct(Number(e.target.value))}
                  />
                  <Input
                    type="number"
                    placeholder="Fee plataforma %"
                    value={platformFeePct}
                    onChange={(e) => setPlatformFeePct(Number(e.target.value))}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)}>Siguiente: tipologias</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card>
              <CardHeader>
                <CardTitle>Tipologias, Distribuciones y Cantidades</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {distributions.map((row, index) => (
                  <div key={`${row.name}-${index}`} className="rounded-lg border border-slate-200 p-3">
                    <div className="grid gap-3 lg:grid-cols-4">
                      <Input placeholder="Nombre tipo" value={row.name} onChange={(e) => updateDistribution(index, { name: e.target.value })} />
                      <select
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={row.category}
                        onChange={(e) => updateDistribution(index, { category: e.target.value as DistributionItem["category"] })}
                      >
                        <option value="APARTMENT">Apartamento</option>
                        <option value="HOUSE">Vivienda</option>
                        <option value="COMMERCIAL_LOCAL">Local comercial</option>
                        <option value="OFFICE">Oficina</option>
                        <option value="PARKING">Estacionamiento</option>
                        <option value="STORAGE">Deposito</option>
                        <option value="OTHER">Otro</option>
                      </select>
                      <Input
                        type="number"
                        placeholder="Cantidad"
                        value={row.quantity}
                        onChange={(e) => updateDistribution(index, { quantity: Number(e.target.value) })}
                      />
                      <Input
                        type="number"
                        placeholder="Area m2"
                        value={row.areaM2}
                        onChange={(e) => updateDistribution(index, { areaM2: Number(e.target.value) })}
                      />
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-4">
                      <Input
                        type="number"
                        placeholder="Precio base"
                        value={row.basePrice}
                        onChange={(e) => updateDistribution(index, { basePrice: Number(e.target.value) })}
                      />
                      <Input
                        type="number"
                        placeholder="Habitaciones"
                        value={row.bedrooms}
                        onChange={(e) => updateDistribution(index, { bedrooms: Number(e.target.value) })}
                      />
                      <Input
                        type="number"
                        placeholder="Banos"
                        value={row.bathrooms}
                        onChange={(e) => updateDistribution(index, { bathrooms: Number(e.target.value) })}
                      />
                      <Input
                        type="number"
                        placeholder="Estac."
                        value={row.parkingSpots}
                        onChange={(e) => updateDistribution(index, { parkingSpots: Number(e.target.value) })}
                      />
                    </div>
                    <textarea
                      className="mt-3 min-h-16 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Descripcion"
                      value={row.description}
                      onChange={(e) => updateDistribution(index, { description: e.target.value })}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button variant="outline" onClick={() => setDistributions((prev) => prev.filter((_, idx) => idx !== index))}>
                        Eliminar tipo
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap justify-between gap-2">
                  <Button variant="secondary" onClick={() => setDistributions((prev) => [...prev, { ...emptyDistribution }])}>
                    Agregar tipologia
                  </Button>
                  <Badge variant={plannedUnits === totalUnits ? "success" : "warning"}>
                    Unidades planificadas: {plannedUnits} / declaradas: {totalUnits}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Volver
                  </Button>
                  <Button onClick={() => setStep(3)}>Siguiente: amenidades</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 3 ? (
            <Card>
              <CardHeader>
                <CardTitle>Amenidades, Areas Sociales y Espacios del Proyecto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {amenities.map((row, index) => (
                  <div key={`${row.name}-${index}`} className="rounded-lg border border-slate-200 p-3">
                    <div className="grid gap-3 lg:grid-cols-3">
                      <Input placeholder="Nombre (ej: Gimnasio)" value={row.name} onChange={(e) => updateAmenity(index, { name: e.target.value })} />
                      <select
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={row.category}
                        onChange={(e) => updateAmenity(index, { category: e.target.value as AmenityItem["category"] })}
                      >
                        <option value="GYM">Gimnasio</option>
                        <option value="SOCIAL_AREA">Area social</option>
                        <option value="BBQ">Parrillera</option>
                        <option value="POOL">Piscina</option>
                        <option value="COWORK">Cowork</option>
                        <option value="KIDS">Area infantil</option>
                        <option value="SPORT">Deportes</option>
                        <option value="PARKING">Parking</option>
                        <option value="COMMERCIAL">Comercial</option>
                        <option value="OTHER">Otro</option>
                      </select>
                      <Input
                        type="number"
                        placeholder="Area m2"
                        value={row.sizeM2}
                        onChange={(e) => updateAmenity(index, { sizeM2: Number(e.target.value) })}
                      />
                    </div>
                    <textarea
                      className="mt-3 min-h-16 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Descripcion"
                      value={row.description}
                      onChange={(e) => updateAmenity(index, { description: e.target.value })}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button variant="outline" onClick={() => setAmenities((prev) => prev.filter((_, idx) => idx !== index))}>
                        Eliminar area
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="secondary" onClick={() => setAmenities((prev) => [...prev, { ...emptyAmenity }])}>
                  Agregar amenidad/area
                </Button>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Volver
                  </Button>
                  <Button onClick={() => setStep(4)}>Siguiente: revisar</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 4 ? (
            <Card>
              <CardHeader>
                <CardTitle>Revision Final y Creacion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <strong>Proyecto:</strong> {name || "-"} ({propertyKind}/{inventoryMode})
                </p>
                <p>
                  <strong>Slug sugerido:</strong> {slug || toSlug(name)}
                </p>
                <p>
                  <strong>Ubicacion:</strong> {address || "-"}, {city || "-"}, {country || "-"}
                </p>
                <p>
                  <strong>Unidades:</strong> declaradas {totalUnits}, distribuidas {plannedUnits}
                </p>
                <p>
                  <strong>Pisos/Torres:</strong> {totalFloors} / {towerCount}
                </p>
                <p>
                  <strong>Amenidades:</strong> {amenities.filter((row) => row.name.trim()).length}
                </p>
                <p>
                  <strong>Dominio:</strong> {domainHost || "(se puede configurar luego)"}
                </p>
                <p>
                  <strong>Self-signup CLIENT:</strong> {selfSignupEnabled ? "Si" : "No"}
                </p>
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    Volver
                  </Button>
                  <Button onClick={() => void createProject()} disabled={loading}>
                    {loading ? "Creando proyecto..." : "Crear proyecto completo"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>
      </div>

      {status ? (
        <Card>
          <CardContent className="py-4 text-sm">{status}</CardContent>
        </Card>
      ) : null}

      {createdTenant ? (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardHeader>
            <CardTitle>Proyecto creado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Tenant: <strong>{createdTenant.id}</strong>
            </p>
            <p>
              Slug: <strong>{createdTenant.slug}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/app/root/configurator">Abrir configurador Root</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/root/site">Abrir Site Builder</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/app/root">Volver al dashboard Root</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
