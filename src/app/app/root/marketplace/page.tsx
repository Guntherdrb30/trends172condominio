import { RootMarketplaceConsole } from "@/components/root/root-marketplace-console";
import { requirePageAccess } from "@/server/auth/page-access";

export const dynamic = "force-dynamic";

export default async function RootMarketplacePage() {
  await requirePageAccess(["ROOT"], "/app/root/marketplace");
  return <RootMarketplaceConsole />;
}
