import { randomUUID } from "node:crypto";

import { matchesEntityGuess } from "@/src/lib/game/answer-matching";
import { createRoundState, parseRoundState, serializeRoundState } from "@/src/lib/game/round-token";
import { getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";
import type {
  EntityCategory,
  GuessRoundInput,
  GuessRoundResult,
  NormalizedEntity,
  StartRoundInput,
  StartRoundResult,
} from "@/src/lib/types";
import { hashString } from "@/src/lib/utils/hash";

const SCORE_BY_REVEAL_INDEX = [100, 80, 60, 40, 20, 10];

function getScoreForRevealCount(revealCount: number): number {
  return SCORE_BY_REVEAL_INDEX[Math.min(revealCount - 1, SCORE_BY_REVEAL_INDEX.length - 1)] ?? 10;
}

function pickEntity(entities: NormalizedEntity[], seed: string): NormalizedEntity {
  const index = Number.parseInt(hashString(seed).slice(0, 8), 16) % entities.length;
  return entities[index]!;
}

function getRevealedClues(entity: NormalizedEntity, revealCount: number) {
  return entity.clues.slice(0, revealCount);
}

export async function startRound(input: StartRoundInput = {}): Promise<StartRoundResult> {
  const snapshot = await getLatestSnapshot();
  const allowedCategories = input.category && input.category !== "random" ? [input.category] : (["countries", "cities", "people"] as const);
  const availableEntities = snapshot.entities.filter((entity) =>
    allowedCategories.includes(entity.category as EntityCategory),
  );

  if (availableEntities.length === 0) {
    throw new Error("No playable entities are available for that category.");
  }

  const seed = input.seed ?? randomUUID();
  const entity = pickEntity(availableEntities, seed);
  const roundState = createRoundState({
    entityId: entity.id,
    category: entity.category,
    revealCount: 1,
    seed,
    totalClues: entity.clues.length,
  });

  return {
    roundId: roundState.roundId,
    token: serializeRoundState(roundState),
    category: entity.category,
    revealedClues: getRevealedClues(entity, roundState.revealCount),
    remainingClues: Math.max(entity.clues.length - roundState.revealCount, 0),
  };
}

export async function submitGuess(input: GuessRoundInput): Promise<GuessRoundResult> {
  const snapshot = await getLatestSnapshot();
  const roundState = parseRoundState(input.token);
  const entity = snapshot.entities.find((candidate) => candidate.id === roundState.entityId);

  if (!entity) {
    throw new Error("Round entity no longer exists in the current snapshot.");
  }

  const isCorrect = matchesEntityGuess(entity, input.guess);

  if (isCorrect) {
    return {
      roundId: roundState.roundId,
      token: null,
      category: entity.category,
      isCorrect: true,
      isComplete: true,
      canonicalAnswer: entity.canonicalAnswer,
      revealedClues: getRevealedClues(entity, roundState.revealCount),
      remainingClues: Math.max(entity.clues.length - roundState.revealCount, 0),
      score: getScoreForRevealCount(roundState.revealCount),
    };
  }

  const nextRevealCount = Math.min(roundState.revealCount + 1, entity.clues.length);
  const isComplete = nextRevealCount >= entity.clues.length;
  const nextState = {
    ...roundState,
    revealCount: nextRevealCount,
  };

  return {
    roundId: roundState.roundId,
    token: isComplete ? null : serializeRoundState(nextState),
    category: entity.category,
    isCorrect: false,
    isComplete,
    canonicalAnswer: isComplete ? entity.canonicalAnswer : null,
    revealedClues: getRevealedClues(entity, nextRevealCount),
    remainingClues: Math.max(entity.clues.length - nextRevealCount, 0),
    score: 0,
  };
}
