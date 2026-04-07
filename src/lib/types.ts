export const ENTITY_CATEGORIES = ["countries", "cities", "people"] as const;

export type EntityCategory = (typeof ENTITY_CATEGORIES)[number];

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
}

export type EntityMetadataValue = string | number | boolean | null;

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

export type SourceClaimValue =
  | { type: "entity"; id: string; label: string | null }
  | { type: "string"; value: string }
  | { type: "quantity"; amount: number; unit: string | null }
  | { type: "time"; value: string; precision: number | null }
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
    },
  ) => NormalizedEntity | null;
}

export interface StartRoundInput {
  category?: EntityCategory | "random";
  seed?: string;
}

export interface RoundState {
  roundId: string;
  entityId: string;
  category: EntityCategory;
  seed: string;
  revealCount: number;
  totalClues: number;
}

export interface StartRoundResult {
  roundId: string;
  token: string;
  category: EntityCategory;
  revealedClues: PlayableClue[];
  remainingClues: number;
}

export interface GuessRoundInput {
  token: string;
  guess: string;
}

export interface GuessRoundResult {
  roundId: string;
  token: string | null;
  category: EntityCategory;
  isCorrect: boolean;
  isComplete: boolean;
  canonicalAnswer: string | null;
  revealedClues: PlayableClue[];
  remainingClues: number;
  score: number;
}
