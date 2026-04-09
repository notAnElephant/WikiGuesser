import { randomUUID } from "node:crypto";

import { getClerkUserIdFromActorId } from "@/src/lib/auth/actor";
import { matchesEntityGuess } from "@/src/lib/game/answer-matching";
import {
  createRoundState,
  parseRoundState,
  serializeRoundState,
} from "@/src/lib/game/round-token";
import {
  findDailyResultForActor,
  getDailyEntityForChallenge,
  getOrCreateDailyChallenge,
  recordCompletedDailyRound,
} from "@/src/lib/repository/daily-repository";
import { recordCompletedRound } from "@/src/lib/repository/game-stats-repository";
import { getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";
import type {
  GameMode,
  GuessRoundInput,
  GuessRoundResult,
  NormalizedEntity,
  RevealClueInput,
  RevealClueResult,
  RoundClue,
  RoundState,
  StartDailyRoundInput,
  StartRoundInput,
  StartRoundResult,
} from "@/src/lib/types";
import { ACTIVE_GAME_CATEGORIES, type EntityCategory } from "@/src/lib/types";
import { hashString } from "@/src/lib/utils/hash";

const SCORE_BY_REVEAL_INDEX = [100, 80, 60, 40, 20, 10];
const DEFAULT_GAME_MODE: GameMode = "classic";

function getScoreForRevealCount(revealCount: number): number {
  const normalizedRevealCount = Math.max(revealCount, 1);
  return (
    SCORE_BY_REVEAL_INDEX[
      Math.min(normalizedRevealCount - 1, SCORE_BY_REVEAL_INDEX.length - 1)
    ] ?? 10
  );
}

function pickEntity(
  entities: NormalizedEntity[],
  seed: string,
): NormalizedEntity {
  const index =
    Number.parseInt(hashString(seed).slice(0, 8), 16) % entities.length;
  return entities[index]!;
}

function getRevealedClues(
  entity: NormalizedEntity,
  revealedClueKeys: string[],
) {
  const revealedClueSet = new Set(revealedClueKeys);
  return entity.clues.filter((clue) => revealedClueSet.has(clue.key));
}

function getClues(
  entity: NormalizedEntity,
  revealedClueKeys: string[],
  options?: { revealAll?: boolean },
): RoundClue[] {
  const revealedClueSet = new Set(revealedClueKeys);

  return entity.clues.map((clue) => {
    const isRevealed = options?.revealAll || revealedClueSet.has(clue.key);

    return {
      key: clue.key,
      label: clue.label,
      value: isRevealed ? clue.value : null,
      prefetchedValue: clue.value,
      isRevealed,
      difficulty: clue.difficulty,
      spoilerLevel: clue.spoilerLevel,
    };
  });
}

function getRemainingClues(
  entity: NormalizedEntity,
  revealedClueKeys: string[],
): number {
  return Math.max(entity.clues.length - revealedClueKeys.length, 0);
}

function hasHiddenSafeClues(
  entity: NormalizedEntity,
  revealedClueKeys: string[],
): boolean {
  const revealedClueSet = new Set(revealedClueKeys);
  return entity.clues.some(
    (clue) => clue.spoilerLevel === "safe" && !revealedClueSet.has(clue.key),
  );
}

function getNextClassicClueKey(
  entity: NormalizedEntity,
  roundState: RoundState,
): string | null {
  const revealedClueSet = new Set(roundState.revealedClueKeys);
  return (
    entity.clues.find((clue) => !revealedClueSet.has(clue.key))?.key ?? null
  );
}

function buildRoundProgress(
  entity: NormalizedEntity,
  roundState: RoundState,
  options?: { revealAll?: boolean },
) {
  return {
    kind: roundState.kind,
    category: entity.category,
    mode: roundState.mode,
    clues: getClues(entity, roundState.revealedClueKeys, options),
    revealedClues: getRevealedClues(entity, roundState.revealedClueKeys),
    remainingClues: getRemainingClues(entity, roundState.revealedClueKeys),
    canGuess: roundState.canGuess,
  };
}

function buildTokenizedRoundResult(
  entity: NormalizedEntity,
  roundState: RoundState,
): StartRoundResult | RevealClueResult {
  return {
    roundId: roundState.roundId,
    token: serializeRoundState(roundState),
    ...buildRoundProgress(entity, roundState),
  };
}

async function getRoundEntity(roundToken: string, userId: string) {
  const roundState = parseRoundState(roundToken);

  if (roundState.userId !== userId) {
    throw new Error("Round token does not belong to the authenticated user.");
  }

  if (roundState.kind === "daily") {
    if (!roundState.dailyChallengeId) {
      throw new Error("Daily round token is missing its challenge reference.");
    }

    const { challenge, entity } = await getDailyEntityForChallenge(
      roundState.dailyChallengeId,
    );

    return {
      entity,
      roundState,
      snapshotKey: challenge.snapshotKey,
      dailyChallengeId: challenge.id,
    };
  }

  const snapshot = await getLatestSnapshot();
  const entity = snapshot.entities.find(
    (candidate) => candidate.id === roundState.entityId,
  );

  if (!entity) {
    throw new Error("Round entity no longer exists in the current snapshot.");
  }

  return {
    entity,
    roundState,
    snapshotKey: snapshot.key,
    dailyChallengeId: null,
  };
}

async function persistCompletedRoundIfNeeded(params: {
  actorId: string;
  snapshotKey: string;
  entity: NormalizedEntity;
  roundState: RoundState;
  result: GuessRoundResult;
  dailyChallengeId: string | null;
}) {
  if (!params.result.isComplete) {
    return;
  }

  if (params.roundState.kind === "daily") {
    const record = await recordCompletedDailyRound({
      actorId: params.actorId,
      dailyChallengeId: params.dailyChallengeId!,
      category: params.entity.category,
      mode: params.roundState.mode,
      score: params.result.score,
      isCorrect: params.result.isCorrect,
      revealedClueCount: params.roundState.revealedClueKeys.length,
      totalClues: params.roundState.totalClues,
    });

    params.result.pendingClaimId = record.pendingClaimId;
    return;
  }

  const clerkUserId = getClerkUserIdFromActorId(params.actorId);

  if (!clerkUserId) {
    return;
  }

  await recordCompletedRound({
    clerkUserId,
    roundId: params.roundState.roundId,
    snapshotKey: params.snapshotKey,
    entityId: params.entity.id,
    entityQid: params.entity.qid,
    canonicalAnswer: params.entity.canonicalAnswer,
    category: params.entity.category,
    mode: params.roundState.mode,
    score: params.result.score,
    isCorrect: params.result.isCorrect,
    revealedClueCount: params.roundState.revealedClueKeys.length,
    totalClues: params.roundState.totalClues,
  });
}

export async function startRound(
  input: StartRoundInput = {},
  userId: string,
): Promise<StartRoundResult> {
  const snapshot = await getLatestSnapshot();

  if (
    input.category &&
    input.category !== "random" &&
    !ACTIVE_GAME_CATEGORIES.includes(input.category)
  ) {
    throw new Error("That category is temporarily unavailable.");
  }

  const allowedCategories =
    input.category && input.category !== "random"
      ? [input.category]
      : ACTIVE_GAME_CATEGORIES;
  const availableEntities = snapshot.entities.filter((entity) =>
    allowedCategories.includes(entity.category as EntityCategory),
  );

  if (availableEntities.length === 0) {
    throw new Error("No playable entities are available for that category.");
  }

  const seed = input.seed ?? randomUUID();
  const entity = pickEntity(availableEntities, seed);
  const mode = input.mode ?? DEFAULT_GAME_MODE;
  const revealedClueKeys =
    mode === "classic" && entity.clues[0] ? [entity.clues[0].key] : [];
  const roundState = createRoundState({
    userId,
    entityId: entity.id,
    category: entity.category,
    mode,
    kind: "standard",
    seed,
    revealedClueKeys,
    canGuess: mode === "classic",
    totalClues: entity.clues.length,
  });

  return buildTokenizedRoundResult(entity, roundState);
}

export async function startDailyRound(
  input: StartDailyRoundInput,
  userId: string,
): Promise<StartRoundResult> {
  if (!ACTIVE_GAME_CATEGORIES.includes(input.category)) {
    throw new Error("That category is temporarily unavailable.");
  }

  const challenge = await getOrCreateDailyChallenge(input.category, input.mode);
  const existingResult = await findDailyResultForActor(challenge.id, userId);

  if (existingResult) {
    throw new Error("Daily challenge already completed.");
  }

  const { entity } = await getDailyEntityForChallenge(challenge.id);
  const revealedClueKeys =
    input.mode === "classic" && entity.clues[0] ? [entity.clues[0].key] : [];
  const roundState = createRoundState({
    userId,
    entityId: entity.id,
    category: entity.category,
    mode: input.mode,
    kind: "daily",
    dailyChallengeId: challenge.id,
    dayKey: challenge.dayKey,
    seed: `${challenge.dayKey}:${input.category}:${input.mode}`,
    revealedClueKeys,
    canGuess: input.mode === "classic",
    totalClues: entity.clues.length,
  });

  return buildTokenizedRoundResult(entity, roundState);
}

export async function revealClue(
  input: RevealClueInput,
  userId: string,
): Promise<RevealClueResult> {
  const { entity, roundState } = await getRoundEntity(input.token, userId);

  if (roundState.mode !== "blurred-lines") {
    throw new Error(
      "Manual clue reveals are only available in blurred lines mode.",
    );
  }

  const selectedClue = entity.clues.find((clue) => clue.key === input.clueKey);

  if (!selectedClue) {
    throw new Error("That clue does not exist for this round.");
  }

  if (roundState.revealedClueKeys.includes(selectedClue.key)) {
    throw new Error("That clue is already revealed.");
  }

  if (
    selectedClue.spoilerLevel === "late" &&
    hasHiddenSafeClues(entity, roundState.revealedClueKeys)
  ) {
    throw new Error("That field is still locked.");
  }

  const nextState = {
    ...roundState,
    revealedClueKeys: [...roundState.revealedClueKeys, selectedClue.key],
    canGuess: true,
  };

  return buildTokenizedRoundResult(entity, nextState);
}

export async function submitGuess(
  input: GuessRoundInput,
  userId: string,
): Promise<GuessRoundResult> {
  const { entity, roundState, snapshotKey, dailyChallengeId } =
    await getRoundEntity(input.token, userId);
  const isCorrect = matchesEntityGuess(entity, input.guess);

  if (dailyChallengeId) {
    const existingResult = await findDailyResultForActor(dailyChallengeId, userId);

    if (existingResult) {
      throw new Error("Daily challenge already completed.");
    }
  }

  if (roundState.mode === "blurred-lines" && !roundState.canGuess) {
    throw new Error("Reveal a clue before guessing.");
  }

  if (isCorrect) {
    const result: GuessRoundResult = {
      roundId: roundState.roundId,
      token: null,
      ...buildRoundProgress(entity, roundState, { revealAll: true }),
      isCorrect: true,
      isComplete: true,
      canonicalAnswer: entity.canonicalAnswer,
      score: getScoreForRevealCount(roundState.revealedClueKeys.length),
      pendingClaimId: null,
    };

    await persistCompletedRoundIfNeeded({
      actorId: userId,
      snapshotKey,
      entity,
      roundState,
      result,
      dailyChallengeId,
    });

    return result;
  }

  if (roundState.mode === "blurred-lines") {
    if (roundState.revealedClueKeys.length < entity.clues.length) {
      const nextState = {
        ...roundState,
        canGuess: false,
      };

      return {
        roundId: roundState.roundId,
        token: serializeRoundState(nextState),
        ...buildRoundProgress(entity, nextState),
        isCorrect: false,
        isComplete: false,
        canonicalAnswer: null,
        score: 0,
        pendingClaimId: null,
      };
    }

    const result: GuessRoundResult = {
      roundId: roundState.roundId,
      token: null,
      ...buildRoundProgress(entity, roundState, { revealAll: true }),
      isCorrect: false,
      isComplete: true,
      canonicalAnswer: entity.canonicalAnswer,
      score: 0,
      pendingClaimId: null,
    };

    await persistCompletedRoundIfNeeded({
      actorId: userId,
      snapshotKey,
      entity,
      roundState,
      result,
      dailyChallengeId,
    });

    return result;
  }

  const nextClassicClueKey = getNextClassicClueKey(entity, roundState);

  if (nextClassicClueKey) {
    const nextState = {
      ...roundState,
      revealedClueKeys: [...roundState.revealedClueKeys, nextClassicClueKey],
      canGuess: true,
    };

    return {
      roundId: roundState.roundId,
      token: serializeRoundState(nextState),
      ...buildRoundProgress(entity, nextState),
      isCorrect: false,
      isComplete: false,
      canonicalAnswer: null,
      score: 0,
      pendingClaimId: null,
    };
  }

  const result: GuessRoundResult = {
    roundId: roundState.roundId,
    token: null,
    ...buildRoundProgress(entity, roundState, { revealAll: true }),
    isCorrect: false,
    isComplete: true,
    canonicalAnswer: entity.canonicalAnswer,
    score: 0,
    pendingClaimId: null,
  };

  await persistCompletedRoundIfNeeded({
    actorId: userId,
    snapshotKey,
    entity,
    roundState,
    result,
    dailyChallengeId,
  });

  return result;
}
