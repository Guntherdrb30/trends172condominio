"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function RootConfigurator() {
  const [tenantName, setTenantName] = useState("Articimento Premium");
  const [domain, setDomain] = useState("localhost");
  const [primaryColor, setPrimaryColor] = useState("#0f172a");
  const [commissionPct, setCommissionPct] = useState("3");
  const [typologyName, setTypologyName] = useState("Aurora 2BR");
  const [typologyArea, setTypologyArea] = useState("98");
  const [amenities, setAmenities] = useState({
    skyLounge: true,
    wellnessSpa: true,
    cowork: false,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Tenant + Dominio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <label className="text-sm">
            Nombre tenant
            <Input value={tenantName} onChange={(event) => setTenantName(event.target.value)} />
          </label>
          <label className="text-sm">
            Dominio principal
            <Input value={domain} onChange={(event) => setDomain(event.target.value)} />
          </label>
          <Button>Guardar tenant</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>White-label y reglas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <label className="text-sm">
            Color primario
            <Input value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
          </label>
          <label className="text-sm">
            Comision vendedor %
            <Input value={commissionPct} onChange={(event) => setCommissionPct(event.target.value)} />
          </label>
          <Button variant="secondary">Aplicar branding</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Typology Builder</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <label className="text-sm">
            Nombre tipologia
            <Input value={typologyName} onChange={(event) => setTypologyName(event.target.value)} />
          </label>
          <label className="text-sm">
            Metraje (m2)
            <Input value={typologyArea} onChange={(event) => setTypologyArea(event.target.value)} />
          </label>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm">
            Preview: {typologyName} - {typologyArea} m2
          </div>
          <Button variant="outline">Guardar tipologia</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Amenities checklist</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={amenities.skyLounge}
              onChange={(event) => setAmenities((prev) => ({ ...prev, skyLounge: event.target.checked }))}
            />
            Sky Lounge
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={amenities.wellnessSpa}
              onChange={(event) => setAmenities((prev) => ({ ...prev, wellnessSpa: event.target.checked }))}
            />
            Wellness Spa
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={amenities.cowork}
              onChange={(event) => setAmenities((prev) => ({ ...prev, cowork: event.target.checked }))}
            />
            Cowork
          </label>
          <Button>Configurar seleccionados</Button>
        </CardContent>
      </Card>
    </div>
  );
}
