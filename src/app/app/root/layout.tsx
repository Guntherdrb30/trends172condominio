import Link from "next/link";
import type { ReactNode } from "react";

import { RootTenantSwitcher } from "@/components/root/root-tenant-switcher";
import { requirePageAccess } from "@/server/auth/page-access";

export const dynamic = "force-dynamic";

const links = [
  { href: "/app/root", label: "Dashboard" },
  { href: "/app/root/site", label: "Site Builder" },
  { href: "/app/root/configurator", label: "Control Center" },
  { href: "/app/root/ai-configurator", label: "AI Configurator" },
];

export default async function RootLayout({ children }: { children: ReactNode }) {
  await requirePageAccess(["ROOT"], "/app/root");

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Root Platform</p>
          <RootTenantSwitcher />
          <nav className="grid gap-1">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

