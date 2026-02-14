import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoFunnel } from "@/lib/demo-data";
import { requirePageAccess } from "@/server/auth/page-access";

const links = [
  { href: "/app/client", label: "Client" },
  { href: "/app/seller", label: "Seller" },
  { href: "/app/admin", label: "Admin" },
  { href: "/app/root", label: "Root" },
  { href: "/app/root/configurator", label: "Configurator" },
];

export const dynamic = "force-dynamic";

export default async function RootDashboardPage() {
  await requirePageAccess(["ROOT"], "/app/root");
  return (
    <DashboardShell
      title="Root"
      description="Multi-tenant overview, fee de plataforma, estado de salud y configuraciones globales."
      links={links}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Tenants activos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">1 tenant demo conectado</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fee plataforma</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">$3,480 este mes (2%)</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Funnel agregado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-slate-700">
            <p>Home: {demoFunnel.view_home}</p>
            <p>View Unit: {demoFunnel.view_unit}</p>
            <p>Start Reservation: {demoFunnel.start_reservation}</p>
          </CardContent>
        </Card>
      </div>
      <Button asChild>
        <Link href="/app/root/configurator">Abrir Root Configurator</Link>
      </Button>
    </DashboardShell>
  );
}
