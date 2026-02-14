"use client";

import { type PointerEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UnitDrawer } from "@/components/masterplan/unit-drawer";
import { trackEventClient } from "@/lib/analytics/track-event";
import { cn } from "@/lib/utils";

type PlanUnit = {
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

const statusColor: Record<PlanUnit["status"], string> = {
  AVAILABLE: "#22c55e",
  RESERVED: "#f59e0b",
  SOLD: "#ef4444",
  BLOCKED: "#64748b",
};

type PlanCanvasProps = {
  units: PlanUnit[];
};

export function PlanCanvas({ units }: PlanCanvasProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSlug = searchParams.get("unit");

  const [selectedStatus, setSelectedStatus] = useState<PlanUnit["status"] | "ALL">("ALL");
  const [selectedTypology, setSelectedTypology] = useState<string>("ALL");
  const [selectedView, setSelectedView] = useState<string>("ALL");
  const [selectedFloor, setSelectedFloor] = useState<string>("ALL");
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(500000);
  const [minAreaM2, setMinAreaM2] = useState<number>(0);
  const [maxAreaM2, setMaxAreaM2] = useState<number>(300);
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<"masterplan" | "satellite" | "hybrid">("masterplan");
  const [selectedUnitSlug, setSelectedUnitSlug] = useState(initialSlug ?? "");
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [didDrag, setDidDrag] = useState(false);

  const typologyOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(units.map((unit) => unit.typologySlug)))],
    [units],
  );
  const viewOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(units.map((unit) => unit.view))).sort()],
    [units],
  );
  const floorOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(units.map((unit) => unit.floor))).sort((a, b) => a - b).map(String)],
    [units],
  );

  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      const byStatus = selectedStatus === "ALL" || unit.status === selectedStatus;
      const byPrice = unit.price >= minPrice && unit.price <= maxPrice;
      const byTypology = selectedTypology === "ALL" || unit.typologySlug === selectedTypology;
      const byView = selectedView === "ALL" || unit.view === selectedView;
      const byFloor = selectedFloor === "ALL" || String(unit.floor) === selectedFloor;
      const byArea = unit.areaM2 >= minAreaM2 && unit.areaM2 <= maxAreaM2;
      return byStatus && byPrice && byTypology && byView && byFloor && byArea;
    });
  }, [maxAreaM2, maxPrice, minAreaM2, minPrice, selectedFloor, selectedStatus, selectedTypology, selectedView, units]);

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.slug === selectedUnitSlug),
    [selectedUnitSlug, units],
  );

  function handleSelectUnit(unit: PlanUnit) {
    if (didDrag) {
      return;
    }
    setSelectedUnitSlug(unit.slug);
    const params = new URLSearchParams(searchParams.toString());
    params.set("unit", unit.slug);
    router.replace(`/availability?${params.toString()}`);
    void trackEventClient({
      event: "view_unit",
      path: `/availability?unit=${unit.slug}`,
      metadata: { unitId: unit.id },
    });
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    setDragStart({
      x: event.clientX - pan.x,
      y: event.clientY - pan.y,
    });
    setIsDragging(true);
    setDidDrag(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!dragStart) return;
    const nextX = event.clientX - dragStart.x;
    const nextY = event.clientY - dragStart.y;
    if (Math.abs(nextX - pan.x) > 1 || Math.abs(nextY - pan.y) > 1) {
      setDidDrag(true);
    }
    setPan({
      x: nextX,
      y: nextY,
    });
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    setDragStart(null);
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => setDidDrag(false), 0);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Filtros</h3>
        <div className="grid gap-3">
          <label className="text-sm">
            Estado
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as PlanUnit["status"] | "ALL")}
            >
              <option value="ALL">Todos</option>
              <option value="AVAILABLE">Disponible</option>
              <option value="RESERVED">Reservado</option>
              <option value="SOLD">Vendido</option>
              <option value="BLOCKED">Bloqueado</option>
            </select>
          </label>
          <label className="text-sm">
            Tipologia
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={selectedTypology}
              onChange={(event) => setSelectedTypology(event.target.value)}
            >
              {typologyOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "Todas" : option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Precio minimo
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={minPrice}
              onChange={(event) => setMinPrice(Number(event.target.value || 0))}
            />
          </label>
          <label className="text-sm">
            Precio maximo
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value || 0))}
            />
          </label>
          <label className="text-sm">
            Metraje minimo (m2)
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={minAreaM2}
              onChange={(event) => setMinAreaM2(Number(event.target.value || 0))}
            />
          </label>
          <label className="text-sm">
            Metraje maximo (m2)
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={maxAreaM2}
              onChange={(event) => setMaxAreaM2(Number(event.target.value || 0))}
            />
          </label>
          <label className="text-sm">
            Piso
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={selectedFloor}
              onChange={(event) => setSelectedFloor(event.target.value)}
            >
              {floorOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "Todos" : option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Vista
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={selectedView}
              onChange={(event) => setSelectedView(event.target.value)}
            >
              {viewOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "Todas" : option}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setZoom((z) => Math.min(2.2, z + 0.15))}>
              Zoom +
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}>
              Zoom -
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              Reset
            </Button>
          </div>
          <div className="flex gap-2">
            {(["masterplan", "satellite", "hybrid"] as const).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={mode === m ? "default" : "outline"}
                onClick={() => setMode(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          <p className="text-xs text-slate-600">
            {filteredUnits.length} unidades en vista. Pan: arrastrar sobre el canvas.
          </p>
        </div>
      </aside>

      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_20%_20%,#e2e8f0_0%,#f8fafc_40%,#f1f5f9_100%)] p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="success">Disponible</Badge>
          <Badge variant="warning">Reservado</Badge>
          <Badge variant="destructive">Vendido</Badge>
          <Badge variant="secondary">Bloqueado</Badge>
          <span className="text-xs text-slate-600">modo: {mode}</span>
        </div>

        <div
          className={cn(
            "relative mx-auto aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-xl border border-slate-300 bg-gradient-to-tr from-cyan-50 via-white to-teal-50",
            mode === "satellite" && "from-slate-100 via-slate-200 to-slate-300",
            mode === "hybrid" && "from-cyan-100 via-slate-100 to-emerald-100",
          )}
        >
          <svg
            viewBox="0 0 100 60"
            className={cn("h-full w-full touch-none", isDragging ? "cursor-grabbing" : "cursor-grab")}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {filteredUnits.map((unit) => (
              <polygon
                key={unit.id}
                points={unit.polygon}
                fill={statusColor[unit.status]}
                fillOpacity={0.65}
                stroke="#0f172a"
                strokeWidth={0.35}
                className="cursor-pointer transition-opacity hover:opacity-100"
                onClick={() => handleSelectUnit(unit)}
              />
            ))}
          </svg>
        </div>
      </section>

      <UnitDrawer open={Boolean(selectedUnit)} onOpenChange={(open) => !open && setSelectedUnitSlug("")} unit={selectedUnit} />
    </div>
  );
}
