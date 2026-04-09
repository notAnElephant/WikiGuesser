import { z } from "zod";

import {
  ENTITY_CATEGORIES,
  GAME_MODES,
} from "@/src/lib/types";

const DAILY_CATEGORY_OPTIONS = ["countries", "cities"] as const;

export const startRoundSchema = z.object({
  category: z.enum([...ENTITY_CATEGORIES, "random"]).optional(),
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
});

export const revealClueSchema = z.object({
  token: z.string().min(1),
  clueKey: z.string().min(1),
});
