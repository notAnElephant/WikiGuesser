import { afterEach, describe, expect, it, vi } from "vitest";

async function loadAnalytics(nodeEnv: string, token: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", token);
  vi.resetModules();
  return import("@/src/lib/analytics");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PostHog configuration", () => {
  it("enables PostHog in production when the token is set", async () => {
    const analytics = await loadAnalytics("production", "phc_test");

    expect(analytics.postHogProjectToken).toBe("phc_test");
    expect(analytics.isPostHogConfigured).toBe(true);
  });

  it("disables PostHog in development even when the token is set", async () => {
    const analytics = await loadAnalytics("development", "phc_test");

    expect(analytics.postHogProjectToken).toBeUndefined();
    expect(analytics.isPostHogConfigured).toBe(false);
  });

  it("disables PostHog in production when the token is empty", async () => {
    const analytics = await loadAnalytics("production", "");

    expect(analytics.isPostHogConfigured).toBe(false);
  });
});
