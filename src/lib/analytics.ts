"use client";

import posthog from "posthog-js";

import type { EntityCategory, GameMode, RoundKind } from "@/src/lib/types";

type GameContext = {
  category: EntityCategory;
  game_type: "daily" | "free_play";
  mode: GameMode;
};

type AnalyticsEvents = {
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
  guess_submitted: GameContext & {
    attempt_number: number;
    completed: boolean;
    correct: boolean;
  };
};

export const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
);

export function captureAnalyticsEvent<Event extends keyof AnalyticsEvents>(
  event: Event,
  properties: AnalyticsEvents[Event],
) {
  if (!isPostHogConfigured) {
    return;
  }

  posthog.capture(event, properties);
}

export function toGameContext(
  kind: RoundKind,
  category: EntityCategory,
  mode: GameMode,
): GameContext {
  return {
    category,
    game_type: kind === "daily" ? "daily" : "free_play",
    mode,
  };
}
