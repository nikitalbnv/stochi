import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("posthog provider import safety", () => {
  it("does not crash on import when server env vars are missing", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalBetterAuthSecret = process.env.BETTER_AUTH_SECRET;
    const originalPosthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const originalPosthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    delete process.env.DATABASE_URL;
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

    try {
      await assert.doesNotReject(async () => {
        await import("./posthog-provider");
      });
    } finally {
      if (originalDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = originalDatabaseUrl;
      }

      if (originalBetterAuthSecret === undefined) {
        delete process.env.BETTER_AUTH_SECRET;
      } else {
        process.env.BETTER_AUTH_SECRET = originalBetterAuthSecret;
      }

      if (originalPosthogKey === undefined) {
        delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      } else {
        process.env.NEXT_PUBLIC_POSTHOG_KEY = originalPosthogKey;
      }

      if (originalPosthogHost === undefined) {
        delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
      } else {
        process.env.NEXT_PUBLIC_POSTHOG_HOST = originalPosthogHost;
      }
    }
  });
});
