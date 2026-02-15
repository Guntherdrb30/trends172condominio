"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Signup failed");
      }

      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      router.push("/app/client");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <Input placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Creando..." : "Crear cuenta CLIENT"}
      </Button>
      {status ? <p className="text-sm text-red-600">{status}</p> : null}
    </form>
  );
}

