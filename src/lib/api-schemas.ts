import { z } from "zod";

import { ENTITY_CATEGORIES } from "@/src/lib/types";

export const startRoundSchema = z.object({
  category: z.enum([...ENTITY_CATEGORIES, "random"]).optional(),
  seed: z.string().min(1).optional(),
});

export const submitGuessSchema = z.object({
  token: z.string().min(1),
  guess: z.string().min(1),
});
