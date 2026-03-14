import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildTemplateStackPayloads,
  buildOnboardingStackItems,
  buildOnboardingProtocolItems,
  buildGoalInserts,
} from "./onboarding-payloads";

describe("onboarding payload builders", () => {
  it("preserves onboarding supplement order and timing slots in protocol items", () => {
    const items = buildOnboardingProtocolItems({
      protocolId: "protocol-1",
      stackName: "Morning Reset",
      supplements: [
        { supplementId: "mag", dosage: 400, unit: "mg", timeSlot: "evening" },
        { supplementId: "d3", dosage: 2000, unit: "IU" },
      ],
      now: new Date("2026-03-14T09:00:00.000Z"),
    });

    assert.equal(items.length, 2);
    assert.equal(items[0]?.supplementId, "mag");
    assert.equal(items[0]?.timeSlot, "evening");
    assert.equal(items[0]?.sortOrder, 0);
    assert.equal(items[1]?.supplementId, "d3");
    assert.equal(items[1]?.timeSlot, "morning");
    assert.equal(items[1]?.sortOrder, 1);
    assert.equal(items[0]?.groupName, "Morning Reset");
  });

  it("assigns goal priority from selection order", () => {
    const rows = buildGoalInserts({
      userId: "user-1",
      goals: ["sleep", "energy", "focus"],
      now: new Date("2026-03-14T09:00:00.000Z"),
    });

    assert.deepEqual(
      rows.map((row) => ({ goal: row.goal, priority: row.priority })),
      [
        { goal: "sleep", priority: 1 },
        { goal: "energy", priority: 2 },
        { goal: "focus", priority: 3 },
      ],
    );
  });

  it("builds template stack items and logs from the supplement id map", () => {
    const now = new Date("2026-03-14T08:00:00.000Z");
    const payloads = buildTemplateStackPayloads({
      stackId: "stack-1",
      userId: "user-1",
      templateSupplements: [
        { supplementName: "Magnesium Glycinate", dosage: 400, unit: "mg" },
        { supplementName: "Vitamin D3", dosage: 2000, unit: "IU" },
      ],
      supplementMap: new Map([
        ["Magnesium Glycinate", "supp-1"],
        ["Vitamin D3", "supp-2"],
      ]),
      loggedAt: now,
    });

    assert.equal(payloads.stackItems.length, 2);
    assert.equal(payloads.stackItems[0]?.stackId, "stack-1");
    assert.equal(payloads.stackItems[0]?.supplementId, "supp-1");
    assert.equal(payloads.logs[1]?.supplementId, "supp-2");
    assert.equal(payloads.logs[0]?.userId, "user-1");
    assert.equal(payloads.logs[0]?.loggedAt, now);
  });

  it("builds onboarding stack items in the same order as selected supplements", () => {
    const items = buildOnboardingStackItems({
      stackId: "stack-1",
      supplements: [
        { supplementId: "supp-1", dosage: 100, unit: "mg" },
        { supplementId: "supp-2", dosage: 200, unit: "mg", timeSlot: "bedtime" },
      ],
    });

    assert.equal(items[0]?.supplementId, "supp-1");
    assert.equal(items[1]?.supplementId, "supp-2");
    assert.equal(items[1]?.dosage, 200);
  });
});
