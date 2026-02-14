import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizeHost } from "@/server/tenant/normalize-host";

describe("host normalization", () => {
  it("drops www and ports", () => {
    assert.equal(normalizeHost("www.Example.com:3000"), "example.com");
  });

  it("drops staging prefix", () => {
    assert.equal(normalizeHost("staging.demo.local"), "demo.local");
  });
});

