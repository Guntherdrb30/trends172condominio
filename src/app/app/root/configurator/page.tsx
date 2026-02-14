import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RootConfigurator } from "@/components/root/root-configurator";
import { requirePageAccess } from "@/server/auth/page-access";

const links = [
  { href: "/app/client", label: "Client" },
  { href: "/app/seller", label: "Seller" },
  { href: "/app/admin", label: "Admin" },
  { href: "/app/root", label: "Root" },
  { href: "/app/root/configurator", label: "Configurator" },
];

export const dynamic = "force-dynamic";

export default async function RootConfiguratorPage() {
  await requirePageAccess(["ROOT"], "/app/root/configurator");
  return (
    <DashboardShell
      title="Root Configurator"
      description="CRUD tenant/dominios, branding, reglas de reserva, comisiones, typology builder y amenities checklist."
      links={links}
    >
      <RootConfigurator />
    </DashboardShell>
  );
}
