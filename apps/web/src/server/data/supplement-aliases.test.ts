import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { supplementAliases } from "~/server/data/supplement-aliases";

describe("supplementAliases", () => {
  it("includes molybdenum aliases for fuzzy matching", () => {
    const aliases = supplementAliases.Molybdenum;

    assert.ok(Array.isArray(aliases));
    assert.ok(aliases.includes("molybdenum"));
    assert.ok(aliases.includes("molybdate"));
    assert.ok(aliases.includes("moly"));
  });
});
