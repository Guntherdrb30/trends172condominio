import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageAccess } from "@/server/auth/page-access";
import { createDalContext } from "@/server/dal/context";
import { getTenantReportsSummary } from "@/server/services/reports.service";

const links = [
  { href: "/app/client", label: "Client" },
  { href: "/app/seller", label: "Seller" },
  { href: "/app/admin", label: "Admin" },
  { href: "/app/root", label: "Root" },
];

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const tenantCtx = await requirePageAccess(["ADMIN", "ROOT"], "/app/admin");
  const summary = await getTenantReportsSummary(createDalContext(tenantCtx));
  return (
    <DashboardShell
      title="Admin"
      description="Inventario, reservas por vencer, ventas, pagos, morosidad, usuarios y analytics."
      links={links}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inventario</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            Leads: {summary.leads} | Reservas activas: {summary.reservations.active}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reservas por vencer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            {summary.reservations.expiring24h} reservas expiran en menos de 24h
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pagos + ledger</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            Recibido: ${summary.payments.totalReceived.toLocaleString("en-US")} | Fee plataforma: $
            {summary.ledger.platformFee.toLocaleString("en-US")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Morosidad condominio</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            Pendiente: ${summary.condo.outstanding.toLocaleString("en-US")} | Mora: {summary.condo.overdueCount} cargos
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
