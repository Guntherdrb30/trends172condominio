"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TenantOption = {
  id: string;
  name: string;
  slug: string;
};

export function RootTenantSwitcher() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [targetTenantId, setTargetTenantId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/root/target-tenant");
        const data = (await response.json()) as {
          targetTenantId?: string;
          tenants?: TenantOption[];
        };
        setTargetTenantId(data.targetTenantId ?? "");
        setTenants(data.tenants ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onChange(nextTenantId: string) {
    setTargetTenantId(nextTenantId);
    await fetch("/api/root/target-tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: nextTenantId }),
    });
    router.refresh();
  }

  if (loading) {
    return <p className="text-xs text-slate-500">Cargando tenant target...</p>;
  }

  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      Tenant objetivo
      <select
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        value={targetTenantId}
        onChange={(event) => void onChange(event.target.value)}
      >
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
      </select>
    </label>
  );
}

