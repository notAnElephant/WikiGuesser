import { randomUUID } from "node:crypto";

import { matchesEntityGuess, normalizeGuess } from "@/src/lib/game/answer-matching";
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
const EARTH_RADIUS_KM = 6371;

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

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function getCountryCoordinates(entity: NormalizedEntity): { latitude: number; longitude: number } | null {
  const latitude = entity.metadata.centroidLatitude;
  const longitude = entity.metadata.centroidLongitude;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return { latitude, longitude };
}

function formatCountryDistanceFeedback(actualEntity: NormalizedEntity, guessedEntity: NormalizedEntity): string | null {
  const actualCoordinates = getCountryCoordinates(actualEntity);
  const guessedCoordinates = getCountryCoordinates(guessedEntity);

  if (!actualCoordinates || !guessedCoordinates) {
    return null;
  }

  const latitudeDelta = toRadians(actualCoordinates.latitude - guessedCoordinates.latitude);
  const longitudeDelta = toRadians(actualCoordinates.longitude - guessedCoordinates.longitude);
  const startLatitude = toRadians(guessedCoordinates.latitude);
  const endLatitude = toRadians(actualCoordinates.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const distance = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, haversine)));

  return `${guessedEntity.canonicalAnswer} is ${Math.round(distance).toLocaleString("en-US")} km away.`;
}

export async function startRound(input: StartRoundInput = {}, userId: string): Promise<StartRoundResult> {
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
    userId,
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

export async function submitGuess(input: GuessRoundInput, userId: string): Promise<GuessRoundResult> {
  const snapshot = await getLatestSnapshot();
  const roundState = parseRoundState(input.token);
  const entity = snapshot.entities.find((candidate) => candidate.id === roundState.entityId);

  if (roundState.userId !== userId) {
    throw new Error("Round token does not belong to the authenticated user.");
  }

  if (!entity) {
    throw new Error("Round entity no longer exists in the current snapshot.");
  }

  const isCorrect = matchesEntityGuess(entity, input.guess);
  const guessedCountry =
    entity.category === "countries"
      ? snapshot.entities.find(
          (candidate) =>
            candidate.category === "countries" &&
            candidate.acceptedAnswers.some((answer) => answer.normalized === normalizeGuess(input.guess)),
        ) ?? null
      : null;

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
      guessFeedback: null,
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
    guessFeedback:
      entity.category === "countries" && guessedCountry ? formatCountryDistanceFeedback(entity, guessedCountry) : null,
  };
}
