import { z } from "zod";

import { ENTITY_CATEGORIES, GAME_MODES } from "@/src/lib/types";

export const startRoundSchema = z.object({
  category: z.enum([...ENTITY_CATEGORIES, "random"]).optional(),
  mode: z.enum(GAME_MODES).optional(),
  seed: z.string().min(1).optional(),
});

export const submitGuessSchema = z.object({
  token: z.string().min(1),
  guess: z.string().min(1),
});

export const revealClueSchema = z.object({
  token: z.string().min(1),
  clueKey: z.string().min(1),
});
