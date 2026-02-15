import { AiConfiguratorConsole } from "@/components/root/ai-configurator-console";
import { requirePageAccess } from "@/server/auth/page-access";

export const dynamic = "force-dynamic";

export default async function RootAiConfiguratorPage() {
  await requirePageAccess(["ROOT"], "/app/root/ai-configurator");
  return <AiConfiguratorConsole />;
}

