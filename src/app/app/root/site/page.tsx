import { SiteBuilderConsole } from "@/components/root/site-builder-console";
import { requirePageAccess } from "@/server/auth/page-access";

export const dynamic = "force-dynamic";

export default async function RootSiteBuilderPage() {
  await requirePageAccess(["ROOT"], "/app/root/site");
  return (
    <div className="mx-auto max-w-6xl">
      <SiteBuilderConsole />
    </div>
  );
}

