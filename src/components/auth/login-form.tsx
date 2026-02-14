"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type AppLanguage, getDictionary } from "@/lib/i18n";

export function LoginForm({ language = "ES" }: { language?: AppLanguage }) {
  const t = getDictionary(language);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/app/client";
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
    </form>
  );
}
