import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageAccess } from "@/server/auth/page-access";

const links = [
  { href: "/app/client", label: "Client" },
  { href: "/app/seller", label: "Seller" },
  { href: "/app/admin", label: "Admin" },
  { href: "/app/root", label: "Root" },
];

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requirePageAccess(["ADMIN", "ROOT"], "/app/admin");
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
          <CardContent className="text-sm text-slate-700">Disponible: 6 | Reservado: 2 | Vendido: 1</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reservas por vencer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">3 reservas expiran en menos de 24h</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pagos + ledger</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">Fee plataforma 2% aplicado correctamente.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Morosidad condominio</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">8.4% en cartera vencida mensual.</CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
