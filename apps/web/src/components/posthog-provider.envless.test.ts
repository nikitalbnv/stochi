import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("posthog provider import safety", () => {
  it("does not crash on import when server env vars are missing", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

    await assert.doesNotReject(async () => {
      await import("./posthog-provider");
    });
  });
});
