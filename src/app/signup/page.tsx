import { SignupForm } from "@/components/auth/signup-form";
import { GlassHeader } from "@/components/public/glass-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenantLanguage } from "@/server/tenant/language";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const language = await getTenantLanguage();
  return (
    <div className="min-h-screen bg-slate-50">
      <GlassHeader language={language} />
      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Registro CLIENT por dominio</CardTitle>
          </CardHeader>
          <CardContent>
            <SignupForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

