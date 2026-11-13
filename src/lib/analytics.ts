"use client";

import posthog from "posthog-js";
import type { MapFrameMetrics } from "@/src/lib/map-performance";
import {
  getOfflineAnalyticsEvents,
  removeOfflineAnalyticsEvents,
  saveOfflineAnalyticsEvent,
} from "@/src/lib/offline/storage";

import type {
  ContinentId,
  EntityCategory,
  GameMode,
  GuessRoundInput,
  RoundKind,
} from "@/src/lib/types";

type GameContext = {
  category: EntityCategory;
  continent?: ContinentId;
  game_type: "daily" | "free_play" | "challenge" | "duel";
  mode: GameMode;
  play_origin: "server" | "offline";
  round_id: string;
};

type AnalyticsEvents = {
  map_interaction_performance: MapFrameMetrics & {
    measurement_version: 1;
    app_revision: string;
    input_type: string;
    presentation: "game" | "result";
    embedded: boolean;
    map_width: number;
    map_height: number;
    zoom_start: number;
    zoom_end: number;
    zoom_updates: number;
  };
  chunk_load_reload: {
    boundary: "route" | "global";
  };
  clue_revealed: GameContext & {
    clue_key: string;
    clues_revealed: number;
  };
  game_completed: GameContext & {
    clues_revealed: number;
    guesses: number;
    outcome: "win" | "loss";
    score: number;
  };
  game_given_up: GameContext & {
    clues_revealed: number;
    guesses: number;
  };
  game_started: GameContext;
  challenge_created: { mode: GameMode };
  challenge_shared: { method: "copy" | "native"; content: "invite" | "result" };
  challenge_replay_viewed: { mode: GameMode };
  theme_experiment_assigned: {
    theme: "chocolate" | "matcha";
  };
  theme_rating_prompt_shown: {
    device: "mobile" | "desktop";
    theme: "chocolate" | "matcha";
  };
  theme_rating_submitted: {
    device: "mobile" | "desktop";
    score: number;
    theme: "chocolate" | "matcha";
  };
  feedback_submitted: {
    feedback_kind:
      | "positive"
      | "bug"
      | "content_issue"
      | "confusing"
      | "feature_idea"
      | "other";
    source: "global" | "round-result" | "clue";
  };
  guess_submitted: GameContext & {
    attempt_number: number;
    completed: boolean;
    correct: boolean;
    guess_method: NonNullable<GuessRoundInput["method"]>;
  };
};

// Local `next dev` sessions would otherwise send development-only React
// exceptions to the production project.
export const postHogProjectToken =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
    : undefined;

export const isPostHogConfigured = Boolean(postHogProjectToken);
export const postHogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
let flushingOfflineAnalytics = false;

export function captureAnalyticsEvent<Event extends keyof AnalyticsEvents>(
  event: Event,
  properties: AnalyticsEvents[Event],
) {
  if (!isPostHogConfigured) {
    return;
  }

  if ("play_origin" in properties && properties.play_origin === "offline") {
    const distinctId = posthog.get_distinct_id();
    if (!distinctId || !posthog.is_capturing()) return;
    void saveOfflineAnalyticsEvent({
      uuid: crypto.randomUUID(),
      event,
      timestamp: new Date().toISOString(),
      distinct_id: distinctId,
      properties: {
        ...properties,
        $process_person_profile: false,
        $lib: "wikiguesser-offline",
      },
    })
      .then(flushOfflineAnalytics)
      .catch(() => {});
    return;
  }
  posthog.capture(event, properties);
}

export async function flushOfflineAnalytics() {
  if (!postHogProjectToken || !navigator.onLine || !posthog.is_capturing()) {
    return;
  }

  async function flush() {
    while (navigator.onLine && posthog.is_capturing()) {
      const batch = await getOfflineAnalyticsEvents();
      if (!batch.length || !posthog.is_capturing()) return;
      const response = await fetch(`${postHogHost.replace(/\/$/, "")}/batch/`, {
        method: "POST",
        body: JSON.stringify({ api_key: postHogProjectToken, batch }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return;
      await removeOfflineAnalyticsEvents(batch);
    }
  }

  try {
    if (navigator.locks) {
      await navigator.locks.request("wikiguesser-offline-analytics", flush);
    } else {
      if (flushingOfflineAnalytics) return;
      flushingOfflineAnalytics = true;
      try {
        await flush();
      } finally {
        flushingOfflineAnalytics = false;
      }
    }
  } catch {
    // Retain events when delivery fails so the next flush can retry.
  }
}

// Next.js only logs errors that an app error boundary catches, so exception
// autocapture never sees them.
export function captureAnalyticsException(
  error: unknown,
  properties: Record<string, unknown>,
) {
  if (!isPostHogConfigured) {
    return;
  }

  posthog.captureException(error, properties);
}

export function toGameContext(round: {
  kind: RoundKind | "duel";
  category: EntityCategory;
  mode: GameMode;
  roundId: string;
  continent?: ContinentId | null;
  playOrigin?: GameContext["play_origin"];
}): GameContext {
  return {
    category: round.category,
    ...(round.continent ? { continent: round.continent } : {}),
    game_type: round.kind === "standard" ? "free_play" : round.kind,
    mode: round.mode,
    play_origin: round.playOrigin ?? "server",
    round_id: round.roundId,
  };
}

export function captureGameAction(
  context: GameContext,
  action:
    | { type: "start" }
    | { type: "reveal"; clueKey: string; cluesRevealed: number }
    | {
        type: "guess";
        method: NonNullable<GuessRoundInput["method"]>;
        correct: boolean;
        completed: boolean;
        guesses: number;
        cluesRevealed: number;
        score: number;
      }
    | { type: "give-up"; guesses: number; cluesRevealed: number },
) {
  if (action.type === "start") {
    captureAnalyticsEvent("game_started", context);
  } else if (action.type === "reveal") {
    captureAnalyticsEvent("clue_revealed", {
      ...context,
      clue_key: action.clueKey,
      clues_revealed: action.cluesRevealed,
    });
  } else {
    const progress = {
      ...context,
      clues_revealed: action.cluesRevealed,
      guesses: action.guesses,
    };
    if (action.type === "guess") {
      captureAnalyticsEvent("guess_submitted", {
        ...context,
        attempt_number: action.guesses,
        completed: action.completed,
        correct: action.correct,
        guess_method: action.method,
      });
      if (!action.completed) return;
    } else {
      captureAnalyticsEvent("game_given_up", progress);
    }
    captureAnalyticsEvent("game_completed", {
      ...progress,
      outcome: action.type === "guess" && action.correct ? "win" : "loss",
      score: action.type === "guess" ? action.score : 0,
    });
  }
}
