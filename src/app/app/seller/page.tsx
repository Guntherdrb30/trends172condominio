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

export default async function SellerDashboardPage() {
  await requirePageAccess(["SELLER", "ADMIN", "ROOT"], "/app/seller");
  return (
    <DashboardShell title="Seller" description="Pipeline, ventas y comisiones por tenant." links={links}>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">Leads activos: 24</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ventas cerradas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">Este mes: 4</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comisiones</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">Acumulado: $18,230</CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
