import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { GlassHeader } from "@/components/public/glass-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenantLanguage } from "@/server/tenant/language";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage() {
  const language = await getTenantLanguage();
  return (
    <div className="min-h-screen bg-slate-50">
      <GlassHeader language={language} />
      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Aceptar invitacion ADMIN/SELLER</CardTitle>
          </CardHeader>
          <CardContent>
            <AcceptInviteForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

