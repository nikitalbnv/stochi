import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SAFETY_LIMITS, formatSafetyLimitsForPrompt } from "~/server/data/safety-limits";

describe("SAFETY_LIMITS", () => {
  it("defines a molybdenum upper limit", () => {
    assert.ok(Object.prototype.hasOwnProperty.call(SAFETY_LIMITS, "molybdenum"));

    const molybdenum = (SAFETY_LIMITS as Record<string, { limit: number; unit: string }>)[
      "molybdenum"
    ];

    assert.ok(molybdenum);
    assert.equal(molybdenum.limit, 2000);
    assert.equal(molybdenum.unit, "mcg");
  });

  it("includes molybdenum in safety prompt formatting", () => {
    const formatted = formatSafetyLimitsForPrompt();
    assert.match(formatted, /Molybdenum: max 2000mcg/);
  });
});
