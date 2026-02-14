import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { assertTenantContext, withTenant } from "@/server/dal/context";

describe("tenant DAL guards", () => {
  it("rejects missing tenantId", () => {
    assert.throws(() => assertTenantContext({ tenantId: "" }), /Tenant context is required/i);
  });

  it("accepts valid tenant context", () => {
    assert.doesNotThrow(() => assertTenantContext({ tenantId: "tenant_demo" }));
  });

  it("blocks cross-tenant where clauses", () => {
    assert.throws(
      () => withTenant({ tenantId: "tenant_demo" }, { tenantId: "other_tenant" }),
      /Cross-tenant/i,
    );
  });
});
