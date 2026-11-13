import posthog from "posthog-js";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
    get_distinct_id: () => "test-player",
    is_capturing: vi.fn(() => true),
  },
}));

const storage = vi.hoisted(() => ({
  getOfflineAnalyticsEvents: vi.fn(),
  removeOfflineAnalyticsEvents: vi.fn(),
  saveOfflineAnalyticsEvent: vi.fn(),
}));
vi.mock("@/src/lib/offline/storage", () => storage);

async function loadAnalytics() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_test");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://analytics.example");
  vi.resetModules();
  return import("@/src/lib/analytics");
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const round = {
  kind: "daily",
  category: "countries",
  mode: "classic",
  roundId: "round-1",
} as const;

describe("game analytics", () => {
  it("joins starts, guesses, and completions by round and tracks the guess method", async () => {
    const { captureGameAction, toGameContext } = await loadAnalytics();
    const context = toGameContext(round);
    expect(context).toEqual({
      category: "countries",
      game_type: "daily",
      mode: "classic",
      play_origin: "server",
      round_id: "round-1",
    });

    captureGameAction(context, { type: "start" });
    captureGameAction(context, {
      type: "guess",
      method: "text",
      correct: false,
      completed: false,
      guesses: 1,
      cluesRevealed: 2,
      score: 0,
    });
    captureGameAction(context, {
      type: "guess",
      method: "map",
      correct: true,
      completed: true,
      guesses: 2,
      cluesRevealed: 2,
      score: 50,
    });

    expect(vi.mocked(posthog.capture).mock.calls).toEqual([
      ["game_started", context],
      [
        "guess_submitted",
        {
          ...context,
          attempt_number: 1,
          completed: false,
          correct: false,
          guess_method: "text",
        },
      ],
      [
        "guess_submitted",
        {
          ...context,
          attempt_number: 2,
          completed: true,
          correct: true,
          guess_method: "map",
        },
      ],
      [
        "game_completed",
        {
          ...context,
          guesses: 2,
          clues_revealed: 2,
          outcome: "win",
          score: 50,
        },
      ],
    ]);
  });

  it("records a give-up and a loss for the same attempt", async () => {
    const { captureGameAction, toGameContext } = await loadAnalytics();
    const context = toGameContext({ ...round, kind: "duel" });
    captureGameAction(context, {
      type: "give-up",
      guesses: 0,
      cluesRevealed: 1,
    });

    expect(vi.mocked(posthog.capture).mock.calls).toEqual([
      ["game_given_up", { ...context, guesses: 0, clues_revealed: 1 }],
      [
        "game_completed",
        {
          ...context,
          guesses: 0,
          clues_revealed: 1,
          outcome: "loss",
          score: 0,
        },
      ],
    ]);
  });

  it("stores offline events with their original identity and removes them only after delivery", async () => {
    const { captureGameAction, flushOfflineAnalytics, toGameContext } =
      await loadAnalytics();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    const connection = { onLine: false };
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("navigator", connection);
    storage.saveOfflineAnalyticsEvent.mockResolvedValue(undefined);
    const context = toGameContext({
      ...round,
      kind: "standard",
      playOrigin: "offline",
    });
    captureGameAction(context, { type: "start" });
    const event = storage.saveOfflineAnalyticsEvent.mock.calls[0]?.[0];
    expect(event).toMatchObject({
      uuid: expect.any(String),
      timestamp: expect.any(String),
      distinct_id: "test-player",
      event: "game_started",
      properties: {
        ...context,
        game_type: "free_play",
        play_origin: "offline",
      },
    });
    await flushOfflineAnalytics();
    expect(fetch).not.toHaveBeenCalled();

    connection.onLine = true;
    storage.getOfflineAnalyticsEvents
      .mockResolvedValueOnce([event])
      .mockResolvedValueOnce([event])
      .mockResolvedValueOnce([]);
    await flushOfflineAnalytics();
    expect(storage.removeOfflineAnalyticsEvents).not.toHaveBeenCalled();
    await flushOfflineAnalytics();
    expect(fetch).toHaveBeenLastCalledWith(
      "https://analytics.example/batch/",
      expect.objectContaining({
        body: JSON.stringify({ api_key: "phc_test", batch: [event] }),
      }),
    );
    expect(storage.removeOfflineAnalyticsEvents).toHaveBeenCalledWith([event]);
  });
});
