"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Section = "overview" | "users" | "site" | "commissions" | "condo" | "reports" | "products" | "assets";

type Tenant = {
  id: string;
  name: string;
  domains: Array<{ id: string; host: string; isPrimary: boolean }>;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  whatsappNumber: string | null;
  sellerCommissionPct: number;
  platformFeePct: number;
  reservationTtlHours: number;
};

const sections: Array<{ id: Section; label: string }> = [
  { id: "overview", label: "Resumen" },
  { id: "users", label: "Usuarios" },
  { id: "site", label: "Configuracion sitio" },
  { id: "commissions", label: "Comisiones" },
  { id: "condo", label: "Condominio" },
  { id: "reports", label: "Reportes" },
  { id: "products", label: "Productos" },
  { id: "assets", label: "Bitacora documental" },
];

function money(v: number) {
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function RootCommandCenter({ initialSection = "overview" }: { initialSection?: Section }) {
  const [section, setSection] = useState<Section>(initialSection);
  const [status, setStatus] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [users, setUsers] = useState<Array<{ membershipId: string; role: string; user: { name: string | null; email: string } }>>([]);
  const [rules, setRules] = useState<Array<{ id: string; role: string | null; percentage: number; active: boolean }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; description: string | null; basePrice: number | null; media: unknown[]; _count: { units: number } }>>([]);
  const [assets, setAssets] = useState<Array<{ id: string; name: string; type: string; createdAt: string }>>([]);
  const [summary, setSummary] = useState({
    sales: { closed: 0, closedVolume: 0 },
    commissions: { total: 0 },
    condo: { outstanding: 0, overdueCount: 0, charges: 0, paid: 0 },
    funnel30d: { viewHome: 0, viewUnit: 0, startReservation: 0, completeReservation: 0, scheduleAppointment: 0 },
    leads: 0,
    reservations: { active: 0, expiring24h: 0 },
    payments: { totalReceived: 0, count: 0 },
    ledger: { platformFee: 0, sellerCommission: 0 },
  });

  const [site, setSite] = useState({
    name: "",
    logoUrl: "",
    primaryColor: "#0f172a",
    secondaryColor: "#0ea5e9",
    heroTitle: "",
    heroSubtitle: "",
    seoTitle: "",
    seoDescription: "",
    whatsappNumber: "",
    sellerCommissionPct: "3",
    platformFeePct: "2",
    reservationTtlHours: "48",
  });
  const [domainHost, setDomainHost] = useState("");
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "ADMIN" });
  const [ruleForm, setRuleForm] = useState({ role: "SELLER", percentage: "3" });
  const [productForm, setProductForm] = useState({ name: "", description: "", areaM2: "", basePrice: "", imageUrls: "", videoUrls: "", planUrls: "" });

  const tenant = useMemo(() => tenants.find((item) => item.id === tenantId) ?? null, [tenants, tenantId]);

  const request = useCallback(async <T,>(url: string, init?: RequestInit) => {
    const response = await fetch(url, init);
    const data = (await response.json()) as T & { error?: string };
    if (!response.ok) throw new Error(data.error ?? "Request failed");
    return data;
  }, []);

  const hydrate = useCallback((t: Tenant) => {
    setSite({
      name: t.name,
      logoUrl: t.logoUrl ?? "",
      primaryColor: t.primaryColor ?? "#0f172a",
      secondaryColor: t.secondaryColor ?? "#0ea5e9",
      heroTitle: t.heroTitle ?? "",
      heroSubtitle: t.heroSubtitle ?? "",
      seoTitle: t.seoTitle ?? "",
      seoDescription: t.seoDescription ?? "",
      whatsappNumber: t.whatsappNumber ?? "",
      sellerCommissionPct: String(t.sellerCommissionPct),
      platformFeePct: String(t.platformFeePct),
      reservationTtlHours: String(t.reservationTtlHours),
    });
    setDomainHost(t.domains[0]?.host ?? "");
  }, []);

  const loadTenantData = useCallback(async (id: string) => {
    const [u, r, p, a, s, t] = await Promise.all([
      request<{ users: typeof users }>(`/api/root/users?tenantId=${id}`),
      request<{ rules: typeof rules }>(`/api/root/commission-rules?tenantId=${id}`),
      request<{ products: typeof products }>(`/api/root/products?tenantId=${id}`),
      request<{ assets: typeof assets }>(`/api/root/assets?tenantId=${id}&limit=50`),
      request<{ summary: typeof summary }>(`/api/root/reports/summary?tenantId=${id}`),
      request<{ tenant: Tenant }>(`/api/root/tenants/${id}`),
    ]);
    setUsers(u.users);
    setRules(r.rules);
    setProducts(p.products);
    setAssets(a.assets);
    setSummary(s.summary);
    hydrate(t.tenant);
  }, [hydrate, request]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await request<{ tenants: Tenant[] }>("/api/root/tenants");
        setTenants(data.tenants);
        if (data.tenants[0]) {
          setTenantId(data.tenants[0].id);
          await loadTenantData(data.tenants[0].id);
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Error cargando tenants");
      }
    })();
  }, [loadTenantData, request]);

  async function handleTenantChange(nextTenantId: string) {
    setTenantId(nextTenantId);
    try {
      await loadTenantData(nextTenantId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Error cargando panel");
    }
  }

  async function saveSite() {
    if (!tenantId) return;
    await request(`/api/root/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: site.name,
        logoUrl: site.logoUrl || undefined,
        primaryColor: site.primaryColor,
        secondaryColor: site.secondaryColor,
        heroTitle: site.heroTitle || undefined,
        heroSubtitle: site.heroSubtitle || undefined,
        seoTitle: site.seoTitle || undefined,
        seoDescription: site.seoDescription || undefined,
        whatsappNumber: site.whatsappNumber || undefined,
        sellerCommissionPct: Number(site.sellerCommissionPct),
        platformFeePct: Number(site.platformFeePct),
        reservationTtlHours: Number(site.reservationTtlHours),
      }),
    });
    setStatus("Configuracion guardada.");
    await loadTenantData(tenantId);
  }

  async function createDomain() {
    await request("/api/root/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, host: domainHost, isPrimary: true }),
    });
    setStatus("Dominio registrado.");
    await loadTenantData(tenantId);
  }

  async function createUser() {
    await request("/api/root/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...userForm, tenantId }) });
    setUserForm({ name: "", email: "", password: "", role: "ADMIN" });
    setStatus("Usuario creado.");
    await loadTenantData(tenantId);
  }

  async function createRule() {
    await request("/api/root/commission-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId, role: ruleForm.role, percentage: Number(ruleForm.percentage), active: true }) });
    setStatus("Regla de comision creada.");
    await loadTenantData(tenantId);
  }

  async function createProduct() {
    await request("/api/root/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId,
        name: productForm.name,
        description: productForm.description,
        areaM2: productForm.areaM2 ? Number(productForm.areaM2) : undefined,
        basePrice: productForm.basePrice ? Number(productForm.basePrice) : undefined,
        imageUrls: productForm.imageUrls.split("\n").map((v) => v.trim()).filter(Boolean),
        tourVideoUrls: productForm.videoUrls.split("\n").map((v) => v.trim()).filter(Boolean),
        planPdfUrls: productForm.planUrls.split("\n").map((v) => v.trim()).filter(Boolean),
      }),
    });
    setStatus("Producto creado.");
    setProductForm({ name: "", description: "", areaM2: "", basePrice: "", imageUrls: "", videoUrls: "", planUrls: "" });
    await loadTenantData(tenantId);
  }

  async function uploadTourVideo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("meta", JSON.stringify({ type: "TOUR_MEDIA" }));
    await request<{ assetId: string }>("/api/blob/upload", { method: "POST", body: form });
    setStatus("Video subido en biblioteca privada.");
    await loadTenantData(tenantId);
  }

  async function openAsset(assetId: string) {
    const resp = await request<{ signedUrl: string }>(`/api/blob/signed-url?assetId=${assetId}`);
    window.open(resp.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Root Console</p>
        <select className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={tenantId} onChange={(event) => void handleTenantChange(event.target.value)}>
          {tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <nav className="mt-4 grid gap-1">
          {sections.map((item) => <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`rounded-md px-3 py-2 text-left text-sm ${section === item.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{item.label}</button>)}
        </nav>
      </aside>

      <section className="space-y-4">
        <Card><CardHeader><CardTitle>{sections.find((item) => item.id === section)?.label}</CardTitle></CardHeader><CardContent>{status || `Tenant activo: ${tenant?.name ?? "-"}`}</CardContent></Card>

        {section === "overview" ? <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader><CardTitle>Ventas cerradas</CardTitle></CardHeader><CardContent>{summary.sales.closed} | {money(summary.sales.closedVolume)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Comisiones</CardTitle></CardHeader><CardContent>{money(summary.commissions.total)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Condominio pendiente</CardTitle></CardHeader><CardContent>{money(summary.condo.outstanding)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Funnel 30d</CardTitle></CardHeader><CardContent>{summary.funnel30d.viewHome} / {summary.funnel30d.startReservation} / {summary.funnel30d.completeReservation}</CardContent></Card>
        </div> : null}

        {section === "users" ? <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Crear admin/seller</CardTitle></CardHeader><CardContent className="grid gap-2">
            <Input placeholder="Nombre" value={userForm.name} onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Email" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} />
            <Input placeholder="Password temporal" type="password" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}><option value="ADMIN">ADMIN</option><option value="SELLER">SELLER</option><option value="CLIENT">CLIENT</option></select>
            <Button onClick={() => void createUser()}>Crear usuario</Button>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Usuarios del tenant</CardTitle></CardHeader><CardContent className="space-y-2">{users.map((item) => <div key={item.membershipId} className="rounded-md border p-2"><div className="flex items-center justify-between"><p>{item.user.name ?? "Sin nombre"}</p><Badge variant={item.role === "ADMIN" ? "warning" : item.role === "SELLER" ? "success" : "secondary"}>{item.role}</Badge></div><p className="text-sm text-slate-600">{item.user.email}</p></div>)}</CardContent></Card>
        </div> : null}

        {section === "site" ? <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Branding y configuracion global</CardTitle></CardHeader><CardContent className="grid gap-2">
            <Input placeholder="Nombre del sitio" value={site.name} onChange={(e) => setSite((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Logo URL" value={site.logoUrl} onChange={(e) => setSite((p) => ({ ...p, logoUrl: e.target.value }))} />
            <div className="grid gap-2 sm:grid-cols-2"><Input placeholder="Color primario" value={site.primaryColor} onChange={(e) => setSite((p) => ({ ...p, primaryColor: e.target.value }))} /><Input placeholder="Color secundario" value={site.secondaryColor} onChange={(e) => setSite((p) => ({ ...p, secondaryColor: e.target.value }))} /></div>
            <Input placeholder="Hero title" value={site.heroTitle} onChange={(e) => setSite((p) => ({ ...p, heroTitle: e.target.value }))} />
            <Input placeholder="Hero subtitle" value={site.heroSubtitle} onChange={(e) => setSite((p) => ({ ...p, heroSubtitle: e.target.value }))} />
            <Input placeholder="WhatsApp" value={site.whatsappNumber} onChange={(e) => setSite((p) => ({ ...p, whatsappNumber: e.target.value }))} />
            <Input placeholder="SEO title" value={site.seoTitle} onChange={(e) => setSite((p) => ({ ...p, seoTitle: e.target.value }))} />
            <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="SEO description" value={site.seoDescription} onChange={(e) => setSite((p) => ({ ...p, seoDescription: e.target.value }))} />
            <div className="grid gap-2 sm:grid-cols-3"><Input placeholder="Fee %" value={site.platformFeePct} onChange={(e) => setSite((p) => ({ ...p, platformFeePct: e.target.value }))} /><Input placeholder="Seller %" value={site.sellerCommissionPct} onChange={(e) => setSite((p) => ({ ...p, sellerCommissionPct: e.target.value }))} /><Input placeholder="TTL horas" value={site.reservationTtlHours} onChange={(e) => setSite((p) => ({ ...p, reservationTtlHours: e.target.value }))} /></div>
            <Button onClick={() => void saveSite()}>Guardar sitio</Button>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Dominio + video header 3D</CardTitle></CardHeader><CardContent className="grid gap-2">
            <Input placeholder="Dominio principal" value={domainHost} onChange={(e) => setDomainHost(e.target.value)} />
            <Button variant="secondary" onClick={() => void createDomain()}>Registrar dominio</Button>
            <input type="file" accept="video/*" onChange={(event) => void uploadTourVideo(event)} />
            <div className="rounded-md border p-2 text-sm">{tenant?.domains.map((d) => <p key={d.id}>{d.host} {d.isPrimary ? "(primary)" : ""}</p>)}</div>
          </CardContent></Card>
        </div> : null}

        {section === "commissions" ? <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Regla de comision</CardTitle></CardHeader><CardContent className="grid gap-2">
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={ruleForm.role} onChange={(e) => setRuleForm((p) => ({ ...p, role: e.target.value }))}><option value="SELLER">SELLER</option><option value="ADMIN">ADMIN</option><option value="CLIENT">CLIENT</option></select>
            <Input placeholder="Porcentaje" value={ruleForm.percentage} onChange={(e) => setRuleForm((p) => ({ ...p, percentage: e.target.value }))} />
            <Button onClick={() => void createRule()}>Crear regla</Button>
            <p className="text-sm">Fee plataforma: {money(summary.ledger.platformFee)} | Seller: {money(summary.ledger.sellerCommission)}</p>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Reglas activas</CardTitle></CardHeader><CardContent className="space-y-2">{rules.map((r) => <p key={r.id} className="rounded border p-2 text-sm">{r.role ?? "GLOBAL"} - {r.percentage}% {r.active ? "activa" : "inactiva"}</p>)}</CardContent></Card>
        </div> : null}

        {section === "condo" ? <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader><CardTitle>Cargos</CardTitle></CardHeader><CardContent>{money(summary.condo.charges)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Pagado</CardTitle></CardHeader><CardContent>{money(summary.condo.paid)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Pendiente</CardTitle></CardHeader><CardContent>{money(summary.condo.outstanding)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Mora</CardTitle></CardHeader><CardContent>{summary.condo.overdueCount}</CardContent></Card>
        </div> : null}

        {section === "reports" ? <Card><CardHeader><CardTitle>Reporte comercial Root/Admin</CardTitle></CardHeader><CardContent className="grid gap-1 text-sm">
          <p>Leads: {summary.leads}</p><p>Reservas activas: {summary.reservations.active} | por vencer 24h: {summary.reservations.expiring24h}</p>
          <p>Pagos: {summary.payments.count} | Total recibido: {money(summary.payments.totalReceived)}</p>
          <p>Funnel: home {summary.funnel30d.viewHome} / unit {summary.funnel30d.viewUnit} / start {summary.funnel30d.startReservation} / complete {summary.funnel30d.completeReservation}</p>
        </CardContent></Card> : null}

        {section === "products" ? <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Alta de producto (apto/casa/local)</CardTitle></CardHeader><CardContent className="grid gap-2">
            <Input placeholder="Nombre" value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} />
            <textarea className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Descripcion" value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} />
            <div className="grid gap-2 sm:grid-cols-2"><Input placeholder="Metraje" value={productForm.areaM2} onChange={(e) => setProductForm((p) => ({ ...p, areaM2: e.target.value }))} /><Input placeholder="Precio" value={productForm.basePrice} onChange={(e) => setProductForm((p) => ({ ...p, basePrice: e.target.value }))} /></div>
            <textarea className="min-h-16 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Imagenes URL (1 por linea)" value={productForm.imageUrls} onChange={(e) => setProductForm((p) => ({ ...p, imageUrls: e.target.value }))} />
            <textarea className="min-h-16 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="2 videos URL (1 por linea)" value={productForm.videoUrls} onChange={(e) => setProductForm((p) => ({ ...p, videoUrls: e.target.value }))} />
            <textarea className="min-h-16 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Planos PDF URL (1 por linea)" value={productForm.planUrls} onChange={(e) => setProductForm((p) => ({ ...p, planUrls: e.target.value }))} />
            <Button onClick={() => void createProduct()}>Crear producto</Button>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Catalogo actual</CardTitle></CardHeader><CardContent className="space-y-2">{products.map((p) => <div key={p.id} className="rounded border p-2 text-sm"><p className="font-medium">{p.name}</p><p>{p.description ?? "Sin descripcion"}</p><p>Precio: {money(p.basePrice ?? 0)} | Media: {p.media.length} | Unidades: {p._count.units}</p></div>)}</CardContent></Card>
        </div> : null}

        {section === "assets" ? <Card><CardHeader><CardTitle>Bitacora: contratos, planos, renders, vouchers</CardTitle></CardHeader><CardContent className="space-y-2">{assets.map((item) => <div key={item.id} className="flex items-center justify-between rounded border p-2 text-sm"><div><p className="font-medium">{item.name}</p><p>{item.type} | {new Date(item.createdAt).toLocaleString()}</p></div><Button size="sm" variant="outline" onClick={() => void openAsset(item.id)}>Abrir</Button></div>)}</CardContent></Card> : null}
      </section>
    </div>
  );
}
