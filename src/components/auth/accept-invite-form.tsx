"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Invite acceptance failed");
      }

      if (email) {
        await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
      }
      router.push("/app/seller");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <Input placeholder="Invite token" value={token} onChange={(e) => setToken(e.target.value)} required />
      <Input placeholder="Email invitado" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Validando..." : "Aceptar invitacion"}
      </Button>
      {status ? <p className="text-sm text-red-600">{status}</p> : null}
    </form>
  );
}

