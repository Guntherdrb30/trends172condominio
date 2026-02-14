import { RootCommandCenter } from "@/components/root/root-command-center";
import { requirePageAccess } from "@/server/auth/page-access";

export const dynamic = "force-dynamic";

export default async function RootDashboardPage() {
  await requirePageAccess(["ROOT"], "/app/root");
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <RootCommandCenter />
      </div>
    </div>
  );
}
