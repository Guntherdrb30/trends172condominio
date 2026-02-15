import { RootCommandCenter } from "@/components/root/root-command-center";
import { requirePageAccess } from "@/server/auth/page-access";

export const dynamic = "force-dynamic";

export default async function RootDashboardPage() {
  await requirePageAccess(["ROOT"], "/app/root");
  return (
    <div className="mx-auto max-w-6xl">
      <RootCommandCenter />
    </div>
  );
}
