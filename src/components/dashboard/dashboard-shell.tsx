import Link from "next/link";
import { ReactNode } from "react";

type DashboardShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  links: Array<{ href: string; label: string }>;
};

export function DashboardShell({ title, description, children, links }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-4 p-4 sm:grid-cols-[220px_1fr] sm:p-6">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Dashboards</p>
          <nav className="grid gap-2 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 hover:bg-slate-100">
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="text-sm text-slate-600">{description}</p>
          </section>
          {children}
        </main>
      </div>
    </div>
  );
}

