import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

describe("project smoke checks", () => {
  it("has environment template", () => {
    assert.equal(existsSync(resolve(process.cwd(), ".env.example")), true);
  });

  it("has AGENTS.md guide", () => {
    assert.equal(existsSync(resolve(process.cwd(), "AGENTS.md")), true);
  });
});

