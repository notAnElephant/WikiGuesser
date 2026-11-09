import { randomBytes } from "node:crypto";
import type {
  FriendChallenge,
  FriendChallengeAttempt,
  Prisma,
} from "@prisma/client";
import type { z } from "zod";

import type {
  challengeActionSchema,
  createChallengeSchema,
} from "@/src/lib/api-schemas";
import { getClerkUserIdFromActorId } from "@/src/lib/auth/actor";
import {
  matchesEntityGuess,
  normalizeGuess,
} from "@/src/lib/game/answer-matching";
import { splitCurrencyRevealSegments } from "@/src/lib/game/currency-censor";
import {
  findCountryEntityByGuess,
  getGuessedCountryMapData,
  getSolutionCountryMapData,
} from "@/src/lib/game/guess-direction";
import {
  buildRoundProgress,
  getEffectiveRoundClues,
  getNextClassicClueKey,
  getScoreForGuess,
  validateManualClueReveal,
} from "@/src/lib/game/round-rules";
import * as repository from "@/src/lib/repository/challenge-repository";
import { getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";
import type {
  ChallengeGuess,
  FriendChallengeView,
  GameMode,
  NormalizedEntity,
} from "@/src/lib/types";

function storedEntity(challenge: FriendChallenge) {
  return challenge.entity as unknown as NormalizedEntity & {
    countryOptions: string[];
  };
}

function ruleState(
  challenge: FriendChallenge,
  attempt: FriendChallengeAttempt,
) {
  return {
    kind: "challenge" as const,
    mode: challenge.mode as GameMode,
    revealedClueKeys: attempt.revealedClueKeys as string[],
    canGuess: attempt.canGuess,
  };
}

export function buildChallengeView(
  challenge: FriendChallenge,
  attempt: FriendChallengeAttempt | null,
  actorId: string | null,
): FriendChallengeView {
  const entity = storedEntity(challenge);
  const completed = Boolean(attempt?.completedAt);
  const progress = attempt
    ? buildRoundProgress(entity, ruleState(challenge, attempt), {
        revealAllValues: completed,
      })
    : null;

  // Hidden values and currency qualifiers must not reveal the answer in the payload.
  const clues =
    progress?.clues.map((clue) => {
      const value =
        !completed && clue.key === "currency" && clue.value
          ? splitCurrencyRevealSegments(clue.value, clue.currencyRedactionTexts)
              .map((segment) => (segment.isBlurred ? "???" : segment.text))
              .join("")
          : clue.value;
      return {
        ...clue,
        value,
        prefetchedValue: value ?? "",
        currencyRedactionTexts: undefined,
      };
    }) ?? [];

  return {
    code: challenge.code,
    mode: challenge.mode as GameMode,
    countryOptions: entity.countryOptions,
    isCreator: Boolean(
      actorId &&
      getClerkUserIdFromActorId(actorId) === challenge.creatorClerkUserId,
    ),
    progress:
      attempt && progress
        ? {
            version: attempt.version,
            clues,
            revealedClues: clues
              .filter((clue) => clue.isRevealed)
              .map((clue) => ({
                key: clue.key,
                label: clue.label,
                value: clue.value ?? "",
                difficulty: clue.difficulty,
                spoilerLevel: clue.spoilerLevel,
              })),
            remainingClues: progress.remainingClues,
            canGuess: attempt.canGuess && !completed,
            guesses: attempt.guesses as unknown as ChallengeGuess[],
            isComplete: completed,
            isCorrect: attempt.isCorrect,
            canonicalAnswer: completed ? entity.canonicalAnswer : null,
            score: attempt.score,
            solutionCountry: completed
              ? getSolutionCountryMapData(entity)
              : null,
          }
        : null,
  };
}

async function requireChallenge(code: string) {
  const challenge = await repository.findChallenge(code);
  if (!challenge) throw new Error("That challenge does not exist.");
  return challenge;
}

export async function createFriendChallenge(
  input: z.infer<typeof createChallengeSchema>,
  clerkUserId: string,
) {
  const snapshot = await getLatestSnapshot();
  const entity = snapshot.entities.find(
    (candidate) =>
      candidate.category === "countries" &&
      matchesEntityGuess(candidate, input.country),
  );
  if (!entity || getEffectiveRoundClues(entity, input.mode).length === 0) {
    throw new Error("That country is not available for this mode.");
  }
  const challenge = await repository.createChallenge({
    code: randomBytes(16).toString("base64url"),
    creatorClerkUserId: clerkUserId,
    mode: input.mode,
    entity: {
      ...entity,
      countryOptions: snapshot.entities
        .filter((candidate) => candidate.category === "countries")
        .map((candidate) => candidate.canonicalAnswer)
        .sort((left, right) => left.localeCompare(right)),
    } as unknown as Prisma.InputJsonValue,
  });
  return { code: challenge.code, path: `/challenge/${challenge.code}` };
}

export async function getFriendChallenge(code: string, actorId: string | null) {
  const challenge = await requireChallenge(code);
  const attempt = actorId
    ? await repository.findChallengeAttempt(challenge.id, actorId)
    : null;
  return buildChallengeView(challenge, attempt, actorId);
}

export async function playFriendChallenge(
  code: string,
  actorId: string,
  input: z.infer<typeof challengeActionSchema>,
) {
  const challenge = await requireChallenge(code);
  if (getClerkUserIdFromActorId(actorId) === challenge.creatorClerkUserId) {
    throw new Error(
      "You chose this answer. Share the challenge with your friends.",
    );
  }
  const entity = storedEntity(challenge);
  const mode = challenge.mode as GameMode;
  const clues = getEffectiveRoundClues(entity, mode);

  if (input.action === "start") {
    const attempt = await repository.startChallengeAttempt(
      challenge.id,
      actorId,
      mode === "classic" && clues[0] ? [clues[0].key] : [],
      mode === "classic",
    );
    return buildChallengeView(challenge, attempt, actorId);
  }

  const attempt = await repository.findChallengeAttempt(challenge.id, actorId);
  if (!attempt) throw new Error("Start this challenge first.");
  if (attempt.completedAt)
    throw new Error("You have already completed this challenge.");
  if (attempt.version !== input.version) {
    throw new Error(
      "Your progress changed in another tab. Refresh to continue.",
    );
  }
  const state = ruleState(challenge, attempt);
  const guesses = attempt.guesses as unknown as ChallengeGuess[];
  let nextGuesses = guesses;
  let score = 0;
  let isCorrect = false;
  let completedAt: Date | null = null;

  if (input.action === "reveal") {
    const clue = validateManualClueReveal(entity, state, input.clueKey);
    state.revealedClueKeys = [...state.revealedClueKeys, clue.key];
    state.canGuess = true;
  } else if (input.action === "give-up") {
    completedAt = new Date();
    state.canGuess = false;
  } else {
    if (!state.canGuess) throw new Error("Reveal a clue before guessing.");
    const snapshot = await getLatestSnapshot();
    const guessedEntity = findCountryEntityByGuess(
      input.guess,
      snapshot.entities,
    );
    isCorrect = matchesEntityGuess(entity, input.guess);
    const listedName = entity.countryOptions.find(
      (name) => normalizeGuess(name) === normalizeGuess(input.guess),
    );
    if (!guessedEntity && !listedName && !isCorrect)
      throw new Error("Pick a listed country.");
    const name = isCorrect
      ? entity.canonicalAnswer
      : (guessedEntity?.canonicalAnswer ?? listedName!);
    if (
      guesses.some(
        (guess) => normalizeGuess(guess.name) === normalizeGuess(name),
      )
    ) {
      throw new Error("Already tried that country.");
    }
    const mapData = isCorrect
      ? null
      : getGuessedCountryMapData(name, entity, snapshot.entities);
    nextGuesses = [
      ...guesses,
      { name, direction: mapData?.direction ?? null, mapData },
    ];
    if (isCorrect) {
      score = getScoreForGuess(state.revealedClueKeys.length, input.method);
      completedAt = new Date();
    } else if (mode === "classic") {
      const nextKey = getNextClassicClueKey(entity, state);
      if (nextKey)
        state.revealedClueKeys = [...state.revealedClueKeys, nextKey];
      else completedAt = new Date();
    } else {
      state.canGuess = false;
      if (state.revealedClueKeys.length === clues.length)
        completedAt = new Date();
    }
    if (completedAt) state.canGuess = false;
  }

  const data = {
    revealedClueKeys: state.revealedClueKeys,
    canGuess: state.canGuess,
    guesses: nextGuesses as unknown as Prisma.InputJsonValue,
    score,
    isCorrect,
    completedAt,
  };
  await repository.updateChallengeAttempt(attempt, data);
  return buildChallengeView(
    challenge,
    {
      ...attempt,
      ...data,
      guesses: nextGuesses as unknown as Prisma.JsonValue,
      version: attempt.version + 1,
    },
    actorId,
  );
}
