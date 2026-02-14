import { LoginForm } from "@/components/auth/login-form";
import { GlassHeader } from "@/components/public/glass-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GlassHeader />
      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Ingreso Seguro</CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
