import { z } from "zod";

import { CONTINENT_IDS, ENTITY_CATEGORIES, GAME_MODES } from "@/src/lib/types";

const DAILY_CATEGORY_OPTIONS = ["countries", "cities"] as const;

export const startRoundSchema = z.object({
  category: z.enum([...ENTITY_CATEGORIES, "random"]).optional(),
  continent: z.enum(CONTINENT_IDS).optional(),
  mode: z.enum(GAME_MODES).optional(),
  seed: z.string().min(1).optional(),
});

export const startDailyRoundSchema = z.object({
  category: z.enum(DAILY_CATEGORY_OPTIONS),
  mode: z.enum(GAME_MODES),
});

export const submitGuessSchema = z.object({
  token: z.string().min(1),
  guess: z.string().min(1),
  method: z.enum(["text", "map"]).optional(),
});

export const revealClueSchema = z.object({
  token: z.string().min(1),
  clueKey: z.string().min(1),
});

export const giveUpRoundSchema = z.object({
  token: z.string().min(1),
});

export const createDuelSchema = z.object({
  category: z.enum(ENTITY_CATEGORIES),
  mode: z.enum(GAME_MODES),
  roundCount: z.union([z.literal(3), z.literal(5), z.literal(10)]),
});

export const duelMutationSchema = z.object({
  version: z.number().int().nonnegative(),
});

export const duelGuessSchema = duelMutationSchema.extend({
  guess: z.string().trim().min(1),
  method: z.enum(["text", "map"]).optional(),
});

export const duelRevealSchema = duelMutationSchema.extend({
  clueKey: z.string().trim().min(1),
});

const feedbackContextSchema = z
  .object({
    source: z.enum(["global", "round-result", "clue"]),
    gameType: z.enum(["daily", "free_play"]).optional(),
    category: z.enum(ENTITY_CATEGORIES).optional(),
    mode: z.enum(GAME_MODES).optional(),
    outcome: z.enum(["win", "loss"]).optional(),
    score: z.number().int().nonnegative().optional(),
    cluesRevealed: z.number().int().nonnegative().optional(),
    clueKey: z.string().trim().min(1).max(100).optional(),
    clueLabel: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const createFeedbackSchema = z
  .object({
    kind: z.enum([
      "positive",
      "bug",
      "content_issue",
      "confusing",
      "feature_idea",
      "other",
    ]),
    message: z.string().trim().max(2_000).optional(),
    context: feedbackContextSchema.optional(),
  })
  .strict();
