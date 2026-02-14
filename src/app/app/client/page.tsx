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

export default async function ClientDashboardPage() {
  await requirePageAccess(["CLIENT", "SELLER", "ADMIN", "ROOT"], "/app/client");
  return (
    <DashboardShell
      title="Cliente"
      description="Mis reservas, compra, plan de pagos, documentos y estado de cuenta condominio."
      links={links}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mis reservas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">Unidad A1-0202 | vence en 26h</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Plan de pagos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">3/12 cuotas abonadas. Proxima: $4,200</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">Contrato, vouchers y anexos via signed URL.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Condominio</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">Estado de cuenta al dia.</CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
