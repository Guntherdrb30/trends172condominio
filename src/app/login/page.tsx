import { LoginForm } from "@/components/auth/login-form";
import { GlassHeader } from "@/components/public/glass-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import { getTenantLanguage } from "@/server/tenant/language";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const language = await getTenantLanguage();
  const t = getDictionary(language);

  return (
    <div className="min-h-screen bg-slate-50">
      <GlassHeader language={language} />
      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.secureAccess}</CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm language={language} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
