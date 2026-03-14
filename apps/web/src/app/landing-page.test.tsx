import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

describe("landing page editorial contract", () => {
  it("uses stack-audit wedge copy and section hierarchy", () => {
    const page = readFileSync("src/app/landing-page.tsx", "utf8");

    assert.equal(page.includes("bg-background"), true);
    assert.equal(page.includes("text-foreground"), true);
    assert.equal(
      page.includes("Paste your stack. Spot overlaps, conflicts, and clutter."),
      true,
    );
    assert.equal(page.includes("Your stack grew. Your confidence dropped."), true);
    assert.equal(page.includes("How it works"), true);
    assert.equal(page.includes("What you get from the audit"), true);
    assert.equal(
      page.includes("Why this instead of spreadsheets, notes, or Reddit"),
      true,
    );
    assert.equal(page.includes("Example audit"), true);
    assert.equal(page.includes("For informational purposes only."), true);
    assert.equal(
      /This tool does not provide\s+medical\s+advice, diagnosis, or treatment\./.test(
        page,
      ),
      true,
    );
  });
});
