import { NewProjectWizard } from "@/components/root/new-project-wizard";
import { requirePageAccess } from "@/server/auth/page-access";

export const dynamic = "force-dynamic";

export default async function RootNewProjectPage() {
  await requirePageAccess(["ROOT"], "/app/root/projects/new");
  return <NewProjectWizard />;
}
