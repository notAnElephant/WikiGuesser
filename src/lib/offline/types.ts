import { z } from "zod";

import {
  CONTINENT_IDS,
  GAME_MODES,
  type ContinentId,
  type GameMode,
  type GuessDirection,
  type GuessedCountryMapData,
  type PlayableClue,
  type RoundClue,
  type SolutionCountryMapData,
} from "@/src/lib/types";
import { OFFLINE_COUNTRY_SCHEMA_VERSION } from "@/src/lib/offline/country-pack";

export {
  offlineCountryEntitySchema,
  offlineCountryManifestSchema,
  offlineCountryPackSchema,
} from "@/src/lib/offline/country-pack";
export type {
  OfflineCountryEntity,
  OfflineCountryManifest,
  OfflineCountryPack,
} from "@/src/lib/offline/country-pack";

export const OFFLINE_SCHEMA_VERSION = OFFLINE_COUNTRY_SCHEMA_VERSION;
export const OFFLINE_CACHE_PREFIX = "wikiguesser-offline-countries";

export const offlinePackStateSchema = z.object({
  schemaVersion: z.literal(OFFLINE_SCHEMA_VERSION),
  status: z.enum(["unavailable", "downloading", "ready", "error"]),
  activeSnapshotKey: z.string().nullable(),
  stagedSnapshotKey: z.string().nullable(),
  downloadedAssets: z.number().int().nonnegative(),
  totalAssets: z.number().int().nonnegative(),
  error: z.string().nullable(),
  updatedAt: z.string(),
});

export const offlineDownloadCheckpointSchema = z.object({
  schemaVersion: z.literal(OFFLINE_SCHEMA_VERSION),
  snapshotKey: z.string().min(1),
  completedQids: z.array(z.string().regex(/^Q\d+$/)),
  totalAssets: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

const guessDirectionSchema = z.enum([
  "north",
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
]);

const guessedCountryMapDataSchema = z.object({
  qid: z.string().min(1),
  name: z.string().min(1),
  mapNames: z.array(z.string()),
  latitude: z.number(),
  longitude: z.number(),
  direction: guessDirectionSchema,
});

export const offlineGuessAttemptSchema = z.object({
  name: z.string().min(1),
  direction: guessDirectionSchema.nullable(),
  mapData: guessedCountryMapDataSchema.nullable(),
});

export const offlineRoundStateSchema = z.object({
  schemaVersion: z.literal(OFFLINE_SCHEMA_VERSION),
  playOrigin: z.literal("offline"),
  roundId: z.string().min(1),
  snapshotKey: z.string().min(1),
  entityId: z.string().min(1),
  continent: z.enum(CONTINENT_IDS).nullable(),
  mode: z.enum(GAME_MODES),
  seed: z.string().min(1),
  revealedClueKeys: z.array(z.string()),
  guesses: z.array(offlineGuessAttemptSchema),
  canGuess: z.boolean(),
  totalClues: z.number().int().positive(),
  startedAt: z.string(),
  updatedAt: z.string(),
});

export const offlineModeStatsSchema = z.object({
  schemaVersion: z.literal(OFFLINE_SCHEMA_VERSION),
  mode: z.enum(GAME_MODES),
  roundsPlayed: z.number().int().nonnegative(),
  roundsWon: z.number().int().nonnegative(),
  totalScore: z.number().int().nonnegative(),
  bestScore: z.number().int().nonnegative(),
  currentStreak: z.number().int().nonnegative(),
  bestStreak: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export type OfflinePackState = z.infer<typeof offlinePackStateSchema>;
export type OfflineDownloadCheckpoint = z.infer<
  typeof offlineDownloadCheckpointSchema
>;
export type OfflineRoundState = z.infer<typeof offlineRoundStateSchema>;
export type OfflineGuessAttempt = z.infer<typeof offlineGuessAttemptSchema>;
export type OfflineModeStats = z.infer<typeof offlineModeStatsSchema>;

export interface OfflineRoundProgress {
  playOrigin: "offline";
  roundId: string;
  kind: "standard";
  category: "countries";
  continent: ContinentId | null;
  mode: GameMode;
  clues: RoundClue[];
  revealedClues: PlayableClue[];
  remainingClues: number;
  canGuess: boolean;
  guesses: OfflineGuessAttempt[];
}

export interface OfflineStartRoundResult extends OfflineRoundProgress {
  state: OfflineRoundState;
}

export interface OfflineRevealClueResult extends OfflineRoundProgress {
  state: OfflineRoundState;
}

export interface OfflineGuessRoundResult extends OfflineRoundProgress {
  state: OfflineRoundState | null;
  isCorrect: boolean;
  isComplete: boolean;
  canonicalAnswer: string | null;
  score: number;
  direction?: GuessDirection | null;
  guessedCountry?: GuessedCountryMapData | null;
  solutionCountry?: SolutionCountryMapData | null;
}
