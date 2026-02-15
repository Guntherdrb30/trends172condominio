"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type AppLanguage, getDictionary } from "@/lib/i18n";

const DEFAULT_NEXT_PATH = "/app/client";

function sanitizeNextPath(value: string | null) {
  if (!value) return DEFAULT_NEXT_PATH;
  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_NEXT_PATH;
  }
  return value;
}

export function LoginForm({ language = "ES" }: { language?: AppLanguage }) {
  const t = getDictionary(language);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("client@articimento.local");
  const [password, setPassword] = useState("client123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError(t.invalidCredentials);
      return;
    }
    router.push(nextPath);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="text-sm">
        {t.email}
        <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <label className="text-sm">
        {t.password}
        <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? t.signingIn : t.signIn}
      </Button>
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        <Link href="/signup" className="underline underline-offset-2">
          Registro cliente
        </Link>
        <Link href="/invite/accept" className="underline underline-offset-2">
          Aceptar invitacion
        </Link>
      </div>
    </form>
  );
}
