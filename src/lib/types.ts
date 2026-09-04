export const ENTITY_CATEGORIES = ["countries", "cities", "people"] as const;
export const GAME_MODES = ["classic", "blurred-lines"] as const;
export const CONTINENT_IDS = [
  "africa",
  "asia",
  "europe",
  "americas",
  "oceania",
  "antarctica",
] as const;
export const DAILY_RESET_TIME_ZONE = "Europe/Budapest";

export type EntityCategory = (typeof ENTITY_CATEGORIES)[number];
export type GameMode = (typeof GAME_MODES)[number];
export type ContinentId = (typeof CONTINENT_IDS)[number];
export type RoundKind = "standard" | "daily";
export type GuessDirection =
  | "north"
  | "northeast"
  | "east"
  | "southeast"
  | "south"
  | "southwest"
  | "west"
  | "northwest";

export interface GuessedCountryMapData {
  qid: string;
  name: string;
  mapNames: string[];
  latitude: number;
  longitude: number;
  direction: GuessDirection;
}

export interface SolutionCountryMapData {
  qid: string;
  name: string;
  mapNames: string[];
  latitude: number;
  longitude: number;
}
export const ACTIVE_GAME_CATEGORIES: readonly EntityCategory[] = ["countries"];

export interface AcceptedAnswer {
  kind: "canonical" | "alias" | "wikipedia-title" | "redirect";
  value: string;
  normalized: string;
}

export interface PlayableClue {
  key: string;
  label: string;
  value: string;
  difficulty: number;
  spoilerLevel: "safe" | "late";
  mode?: GameMode;
}

export interface RoundClue {
  key: string;
  label: string;
  value: string | null;
  prefetchedValue: string;
  isRevealed: boolean;
  difficulty: number;
  spoilerLevel: "safe" | "late";
}

export type EntityMetadataValue = string | number | boolean | string[] | null;

export interface NormalizedEntity {
  id: string;
  qid: string;
  category: EntityCategory;
  canonicalAnswer: string;
  wikipediaTitle: string | null;
  acceptedAnswers: AcceptedAnswer[];
  clues: PlayableClue[];
  metadata: Record<string, EntityMetadataValue>;
  sourceFingerprint: string;
}

export interface MaterializedSnapshot {
  key: string;
  sourceFingerprint: string;
  createdAt: string;
  entities: NormalizedEntity[];
}

export interface CategorySummary {
  id: EntityCategory;
  label: string;
  description: string;
  entityCount: number;
}

export interface ContinentOption {
  id: ContinentId;
  label: string;
  entityCount: number;
}

export type SourceClaimValue =
  | { type: "entity"; id: string; label: string | null }
  | { type: "string"; value: string }
  | { type: "quantity"; amount: number; unit: string | null }
  | { type: "time"; value: string; precision: number | null }
  | {
      type: "coordinate";
      latitude: number;
      longitude: number;
      precision: number | null;
    }
  | { type: "monolingualtext"; text: string; language: string | null };

export interface SourceEntity {
  qid: string;
  label: string;
  description: string | null;
  wikipediaTitle: string | null;
  aliases: string[];
  claims: Record<string, SourceClaimValue[]>;
  raw: unknown;
}

export interface CategoryDefinition {
  id: EntityCategory;
  label: string;
  description: string;
  discovery: {
    type: "sparql";
    query: string;
  };
  requiredMinimumClues: number;
  allowedProperties: string[];
  lateRevealProperties: string[];
  bannedProperties: string[];
  clueOrder: string[];
  aliasStrategy: {
    includeWikipediaTitle: boolean;
    includeRedirects: boolean;
    stripParenthetical: boolean;
  };
  normalize: (
    source: SourceEntity,
    options?: {
      redirectAliases?: string[];
      allSourceEntities?: SourceEntity[];
    },
  ) => NormalizedEntity | null;
}

export interface StartRoundInput {
  category?: EntityCategory | "random";
  continent?: ContinentId;
  mode?: GameMode;
  seed?: string;
}

export interface StartDailyRoundInput {
  category: EntityCategory;
  mode: GameMode;
}

export interface RoundState {
  roundId: string;
  userId: string;
  entityId: string;
  category: EntityCategory;
  continent?: ContinentId;
  mode: GameMode;
  kind: RoundKind;
  dailyChallengeId?: string;
  dayKey?: string;
  seed: string;
  revealedClueKeys: string[];
  canGuess: boolean;
  totalClues: number;
}

export interface StartRoundResult {
  roundId: string;
  token: string;
  kind: RoundKind;
  category: EntityCategory;
  continent: ContinentId | null;
  mode: GameMode;
  clues: RoundClue[];
  revealedClues: PlayableClue[];
  remainingClues: number;
  canGuess: boolean;
}

export interface GuessRoundInput {
  token: string;
  guess: string;
  method?: "text" | "map";
}

export interface RevealClueInput {
  token: string;
  clueKey: string;
}

export interface GiveUpRoundInput {
  token: string;
}

export interface RevealClueResult {
  roundId: string;
  token: string;
  kind: RoundKind;
  category: EntityCategory;
  continent: ContinentId | null;
  mode: GameMode;
  clues: RoundClue[];
  revealedClues: PlayableClue[];
  remainingClues: number;
  canGuess: boolean;
}

export interface GuessRoundResult {
  roundId: string;
  token: string | null;
  kind: RoundKind;
  category: EntityCategory;
  continent: ContinentId | null;
  mode: GameMode;
  isCorrect: boolean;
  isComplete: boolean;
  canonicalAnswer: string | null;
  clues: RoundClue[];
  revealedClues: PlayableClue[];
  remainingClues: number;
  canGuess: boolean;
  score: number;
  direction?: GuessDirection | null;
  guessedCountry?: GuessedCountryMapData | null;
  solutionCountry?: SolutionCountryMapData | null;
  pendingClaimId?: string | null;
}

export interface DailyChallengePlayerStatus {
  hasPlayed: boolean;
  score: number | null;
  completedAt: string | null;
}

export interface DailyChallengeCard {
  challengeId: string;
  dayKey: string;
  category: EntityCategory;
  mode: GameMode;
  playerStatus: DailyChallengePlayerStatus;
}

export interface DailyChallengeOption {
  challengeId: string;
  dayKey: string;
  category: EntityCategory;
  mode: GameMode;
  playerStatus: DailyChallengePlayerStatus;
}

export interface DailyChallengeSolution {
  category: EntityCategory;
  mode: GameMode;
  canonicalAnswer: string;
}

export interface DailyLeaderboardEntry {
  playerKey: string;
  displayName: string;
  imageUrl: string | null;
  score: number;
  roundsPlayed?: number;
  roundsWon?: number;
  bestScore?: number;
  completedAt?: string | null;
}

export interface DailyComboLeaderboard {
  today: DailyLeaderboardEntry[];
  total: DailyLeaderboardEntry[];
}

export interface DailyHomeData {
  dayKey: string;
  cards: DailyChallengeCard[];
  leaderboardByCombo: Record<string, DailyComboLeaderboard>;
  defaultCategory: EntityCategory;
  defaultMode: GameMode;
}

export interface DailyLandingData {
  dayKey: string;
  options: DailyChallengeOption[];
  defaultCategory: EntityCategory;
  defaultMode: GameMode;
}

export interface DailyLeaderboardPageData {
  dayKey: string;
  leaderboardByCombo: Record<string, DailyComboLeaderboard>;
  defaultCategory: EntityCategory;
  defaultMode: GameMode;
}

export interface CreateDuelInput {
  category: EntityCategory;
  mode: GameMode;
  roundCount: 3 | 5 | 10;
}

export interface DuelMutationInput {
  version: number;
}

export interface DuelGuessInput extends DuelMutationInput {
  guess: string;
}

export interface DuelRevealInput extends DuelMutationInput {
  clueKey: string;
}
