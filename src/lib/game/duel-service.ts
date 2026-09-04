import { randomBytes, randomUUID } from "node:crypto";

import { Prisma, type DuelAttempt } from "@prisma/client";

import { getClerkUserIdFromActorId } from "@/src/lib/auth/actor";
import { matchesEntityGuess } from "@/src/lib/game/answer-matching";
import { getClueUnlockRoundsRemaining } from "@/src/lib/game/clue-locking";
import {
  getGuessedCountryMapData,
  getSolutionCountryMapData,
} from "@/src/lib/game/guess-direction";
import {
  acceptDuel as acceptStoredDuel,
  completeDuelIfReady,
  createDuel as createStoredDuel,
  ensureDuelUserProfile,
  getDuelByInviteCode,
  getOrCreateDuelAttempt,
  getOrRefreshDuelByInviteCode,
  updateDuelAttempt,
  type DuelWithDetails,
} from "@/src/lib/repository/duel-repository";
import { getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";
import type {
  CreateDuelInput,
  DuelGuessInput,
  DuelRevealInput,
  EntityCategory,
  GameMode,
  GuessedCountryMapData,
  NormalizedEntity,
  PlayableClue,
} from "@/src/lib/types";
import { ACTIVE_GAME_CATEGORIES } from "@/src/lib/types";
import { hashString } from "@/src/lib/utils/hash";

const SCORE_BY_REVEAL_INDEX = [100, 80, 60, 40, 20, 10];
const DUEL_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

type StoredGuess = {
  name: string;
  mapData: GuessedCountryMapData | null;
};

/**
 * Duel creation receives a raw Clerk ID, while the public duel routes pass the
 * application actor ID (for example, `user_123` versus `user:user_123`).
 * Store and compare the raw ID in both cases so a participant retains access
 * after the invitation has been accepted.
 */
function duelProfileKey(actorOrClerkUserId: string) {
  return getClerkUserIdFromActorId(actorOrClerkUserId) ?? actorOrClerkUserId;
}

function asClues(value: Prisma.JsonValue): PlayableClue[] {
  return value as unknown as PlayableClue[];
}

function asStrings(value: Prisma.JsonValue): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function asGuesses(value: Prisma.JsonValue): StoredGuess[] {
  return Array.isArray(value) ? (value as unknown as StoredGuess[]) : [];
}

function effectiveClues(
  round: DuelWithDetails["rounds"][number],
  mode: GameMode,
) {
  return asClues(round.clues).filter(
    (clue) => !clue.mode || clue.mode === mode,
  );
}

function roundEntity(
  duel: DuelWithDetails,
  round: DuelWithDetails["rounds"][number],
): NormalizedEntity {
  return {
    id: round.snapshotEntityId ?? round.id,
    qid: round.entityQid,
    category: duel.category as EntityCategory,
    canonicalAnswer: round.canonicalAnswer,
    wikipediaTitle: null,
    acceptedAnswers:
      round.acceptedAnswers as unknown as NormalizedEntity["acceptedAnswers"],
    clues: asClues(round.clues),
    metadata: (round.metadata ?? {}) as NormalizedEntity["metadata"],
    sourceFingerprint: duel.snapshotKey,
  };
}

function scoreForRevealCount(revealCount: number) {
  const normalized = Math.max(revealCount, 1);
  return (
    SCORE_BY_REVEAL_INDEX[
      Math.min(normalized - 1, SCORE_BY_REVEAL_INDEX.length - 1)
    ] ?? 10
  );
}

function participantId(duel: DuelWithDetails, profileId: string) {
  if (duel.challengerId === profileId) return profileId;
  if (duel.opponentId === profileId) return profileId;
  return null;
}

function attemptFor(
  round: DuelWithDetails["rounds"][number],
  profileId: string | null,
) {
  return profileId
    ? (round.attempts.find((attempt) => attempt.userProfileId === profileId) ??
        null)
    : null;
}

function totalFor(duel: DuelWithDetails, profileId: string | null) {
  if (!profileId) return { completed: 0, score: 0 };
  return duel.rounds.reduce(
    (total, round) => {
      const attempt = attemptFor(round, profileId);
      if (attempt?.completedAt || attempt?.givenUp) total.completed += 1;
      total.score += attempt?.score ?? 0;
      return total;
    },
    { completed: 0, score: 0 },
  );
}

function publicPlayer(
  player: DuelWithDetails["challenger"] | DuelWithDetails["opponent"],
) {
  if (!player) return null;
  return {
    id: player.id,
    name: player.displayName?.trim() || "Player",
    imageUrl: player.imageUrl,
  };
}

function visibleClues(
  duel: DuelWithDetails,
  round: DuelWithDetails["rounds"][number],
  attempt: DuelAttempt | null,
) {
  const revealed = new Set(attempt ? asStrings(attempt.revealedClueKeys) : []);
  const completed = Boolean(attempt?.completedAt || attempt?.givenUp);
  return effectiveClues(round, duel.mode as GameMode).map((clue) => ({
    key: clue.key,
    label: clue.label,
    value: completed || revealed.has(clue.key) ? clue.value : null,
    isRevealed: completed || revealed.has(clue.key),
    difficulty: clue.difficulty,
    spoilerLevel: clue.spoilerLevel,
  }));
}

function roundView(
  duel: DuelWithDetails,
  round: DuelWithDetails["rounds"][number],
  ownAttempt: DuelAttempt | null,
  isCurrent: boolean,
) {
  const completed = Boolean(ownAttempt?.completedAt || ownAttempt?.givenUp);
  const guesses = ownAttempt ? asGuesses(ownAttempt.guesses) : [];
  const clues =
    isCurrent || completed ? visibleClues(duel, round, ownAttempt) : [];

  return {
    position: round.position,
    version: ownAttempt?.version ?? 0,
    status: completed
      ? ("completed" as const)
      : ownAttempt
        ? ("in-progress" as const)
        : isCurrent
          ? ("available" as const)
          : ("waiting" as const),
    clues,
    canGuess: ownAttempt?.canGuess ?? false,
    score: ownAttempt?.score ?? null,
    guess: guesses.at(-1)?.name ?? null,
    guesses,
    answer: completed ? round.canonicalAnswer : null,
    solutionCountry: completed
      ? getSolutionCountryMapData(roundEntity(duel, round))
      : null,
    message:
      ownAttempt && !completed && guesses.length > 0
        ? duel.mode === "blurred-lines"
          ? "Miss. Reveal another clue."
          : "Miss. The next clue is open."
        : completed
          ? ownAttempt?.isCorrect
            ? "Correct."
            : `Answer: ${round.canonicalAnswer}.`
          : null,
  };
}

export function buildDuelView(
  duel: DuelWithDetails,
  profileId: string,
  origin?: string,
) {
  const ownId = participantId(duel, profileId);
  const isChallenger = duel.challengerId === profileId;
  const opponentId = isChallenger ? duel.opponentId : duel.challengerId;
  const ownTotals = totalFor(duel, ownId);
  const opponentTotals = totalFor(duel, opponentId);
  const firstIncomplete = ownId
    ? (duel.rounds.find((round) => {
        const attempt = attemptFor(round, ownId);
        return !attempt?.completedAt && !attempt?.givenUp;
      }) ?? null)
    : null;
  const rounds = duel.rounds.map((round) =>
    roundView(
      duel,
      round,
      attemptFor(round, ownId),
      round.id === firstIncomplete?.id,
    ),
  );
  const status =
    duel.status === "INVITED"
      ? "pending"
      : duel.status === "ACTIVE"
        ? "active"
        : duel.status === "COMPLETED"
          ? "completed"
          : "expired";

  return {
    id: duel.id,
    inviteCode: duel.inviteCode,
    status,
    challenger: publicPlayer(duel.challenger)!,
    opponent: publicPlayer(duel.opponent),
    playerRole: isChallenger ? ("challenger" as const) : ("opponent" as const),
    canAccept: duel.status === "INVITED" && !duel.opponentId && !isChallenger,
    settings: {
      rounds: duel.roundCount,
      category: duel.category,
      mode: duel.mode,
    },
    rounds,
    currentRound:
      duel.status === "ACTIVE" && firstIncomplete
        ? (rounds.find(
            (round) => round.position === firstIncomplete.position,
          ) ?? null)
        : null,
    opponentProgress: {
      completed: opponentTotals.completed,
      score: duel.status === "COMPLETED" ? opponentTotals.score : null,
    },
    scores:
      duel.status === "COMPLETED"
        ? {
            challenger: totalFor(duel, duel.challengerId).score,
            opponent: totalFor(duel, duel.opponentId).score,
          }
        : undefined,
    shareUrl: origin ? `${origin}/duel/${duel.inviteCode}` : undefined,
    expiresAt: duel.expiresAt.toISOString(),
    ownProgress: ownTotals,
  };
}

async function refreshView(
  inviteCode: string,
  profileId: string,
  origin?: string,
) {
  const refreshed = await getDuelByInviteCode(inviteCode);
  if (!refreshed) throw new Error("That duel invitation does not exist.");
  return buildDuelView(refreshed, profileId, origin);
}

export async function createDuel(
  input: CreateDuelInput,
  clerkUserId: string,
  origin?: string,
) {
  if (!ACTIVE_GAME_CATEGORIES.includes(input.category)) {
    throw new Error("That category is temporarily unavailable.");
  }
  const [snapshot, challenger] = await Promise.all([
    getLatestSnapshot(),
    ensureDuelUserProfile(clerkUserId),
  ]);
  const candidates = snapshot.entities.filter(
    (entity) => entity.category === input.category,
  );
  if (candidates.length < input.roundCount) {
    throw new Error("There are not enough distinct answers for this duel.");
  }

  const seed = randomUUID();
  const selected = candidates
    .map((entity) => ({ entity, rank: hashString(`${seed}:${entity.id}`) }))
    .sort((left, right) => left.rank.localeCompare(right.rank))
    .slice(0, input.roundCount)
    .map(({ entity }) => entity);
  const inviteCode = randomBytes(9).toString("base64url");
  const duel = await createStoredDuel({
    inviteCode,
    category: input.category,
    mode: input.mode,
    roundCount: input.roundCount,
    snapshotKey: snapshot.key,
    challengerId: challenger.id,
    expiresAt: new Date(Date.now() + DUEL_LIFETIME_MS),
    rounds: selected.map((entity) => ({
      snapshotEntityId: entity.id,
      entityQid: entity.qid,
      canonicalAnswer: entity.canonicalAnswer,
      acceptedAnswers:
        entity.acceptedAnswers as unknown as Prisma.InputJsonValue,
      clues: entity.clues as unknown as Prisma.InputJsonValue,
      metadata: entity.metadata as unknown as Prisma.InputJsonValue,
    })),
  });
  const view = buildDuelView(duel, challenger.id, origin);
  return {
    duel: view,
    inviteCode,
    inviteUrl: origin ? `${origin}/duel/${inviteCode}` : `/duel/${inviteCode}`,
  };
}

export async function getDuel(
  inviteCode: string,
  actorOrClerkUserId: string,
  origin?: string,
) {
  const clerkUserId = duelProfileKey(actorOrClerkUserId);
  const [duel, profile] = await Promise.all([
    getOrRefreshDuelByInviteCode(inviteCode),
    ensureDuelUserProfile(clerkUserId),
  ]);
  if (!duel) throw new Error("That duel invitation does not exist.");
  if (
    duel.opponentId &&
    duel.challengerId !== profile.id &&
    duel.opponentId !== profile.id
  ) {
    throw new Error("This duel belongs to two other players.");
  }
  return buildDuelView(duel, profile.id, origin);
}

export async function acceptDuel(
  inviteCode: string,
  actorOrClerkUserId: string,
  origin?: string,
) {
  const clerkUserId = duelProfileKey(actorOrClerkUserId);
  const profile = await ensureDuelUserProfile(clerkUserId);
  const duel = await acceptStoredDuel(inviteCode, profile.id);
  return buildDuelView(duel, profile.id, origin);
}

export async function createDuelRematch(
  inviteCode: string,
  actorOrClerkUserId: string,
  origin?: string,
) {
  const clerkUserId = duelProfileKey(actorOrClerkUserId);
  const [source, profile] = await Promise.all([
    getOrRefreshDuelByInviteCode(inviteCode),
    ensureDuelUserProfile(clerkUserId),
  ]);
  if (!source) throw new Error("That duel does not exist.");
  if (!participantId(source, profile.id)) {
    throw new Error("Only duel participants can request a rematch.");
  }
  if (source.status !== "COMPLETED") {
    throw new Error("Finish the duel before requesting a rematch.");
  }
  return createDuel(
    {
      category: source.category as EntityCategory,
      mode: source.mode as GameMode,
      roundCount: source.roundCount as 3 | 5 | 10,
    },
    clerkUserId,
    origin,
  );
}

async function participantRound(
  inviteCode: string,
  position: number,
  actorOrClerkUserId: string,
) {
  const clerkUserId = duelProfileKey(actorOrClerkUserId);
  const [duel, profile] = await Promise.all([
    getOrRefreshDuelByInviteCode(inviteCode),
    ensureDuelUserProfile(clerkUserId),
  ]);
  if (!duel) throw new Error("That duel invitation does not exist.");
  if (duel.status !== "ACTIVE") throw new Error("That duel is not active.");
  if (!participantId(duel, profile.id)) {
    throw new Error("You are not a participant in this duel.");
  }
  const round = duel.rounds.find(
    (candidate) => candidate.position === position,
  );
  if (!round) throw new Error("That duel round does not exist.");
  const previous = duel.rounds.filter(
    (candidate) => candidate.position < position,
  );
  if (
    previous.some((candidate) => {
      const attempt = attemptFor(candidate, profile.id);
      return !attempt?.completedAt && !attempt?.givenUp;
    })
  ) {
    throw new Error("Complete the earlier duel rounds first.");
  }
  return { duel, profile, round };
}

export async function startDuelRound(
  inviteCode: string,
  position: number,
  clerkUserId: string,
  origin?: string,
) {
  const { duel, profile, round } = await participantRound(
    inviteCode,
    position,
    clerkUserId,
  );
  const clues = effectiveClues(round, duel.mode as GameMode);
  await getOrCreateDuelAttempt(round.id, profile.id, {
    revealedClueKeys: duel.mode === "classic" && clues[0] ? [clues[0].key] : [],
    canGuess: duel.mode === "classic",
  });
  return refreshView(inviteCode, profile.id, origin);
}

export async function revealDuelClue(
  inviteCode: string,
  position: number,
  input: DuelRevealInput,
  clerkUserId: string,
  origin?: string,
) {
  const { duel, profile, round } = await participantRound(
    inviteCode,
    position,
    clerkUserId,
  );
  if (duel.mode !== "blurred-lines") {
    throw new Error("Manual reveals are only available in Choose Clues mode.");
  }
  const attempt = attemptFor(round, profile.id);
  if (!attempt) throw new Error("Start this duel round first.");
  if (attempt.completedAt || attempt.givenUp)
    throw new Error("This round is complete.");
  const clues = effectiveClues(round, duel.mode as GameMode);
  const selected = clues.find((clue) => clue.key === input.clueKey);
  if (!selected) throw new Error("That clue does not exist.");
  const revealed = asStrings(attempt.revealedClueKeys);
  if (revealed.includes(selected.key))
    throw new Error("That clue is already revealed.");
  const clueUnlockState = clues.map((clue) => ({
    key: clue.key,
    spoilerLevel: clue.spoilerLevel,
    isRevealed: revealed.includes(clue.key),
  }));
  const selectedClueUnlockState = clueUnlockState.find(
    (clue) => clue.key === selected.key,
  )!;
  const unlockRoundsRemaining = getClueUnlockRoundsRemaining(
    clueUnlockState,
    selectedClueUnlockState,
  );
  if (unlockRoundsRemaining > 0) {
    throw new Error(
      `That field unlocks in ${unlockRoundsRemaining} ${unlockRoundsRemaining === 1 ? "round" : "rounds"}.`,
    );
  }
  await updateDuelAttempt(attempt.id, profile.id, input.version, {
    revealedClueKeys: [...revealed, selected.key],
    canGuess: true,
  });
  return refreshView(inviteCode, profile.id, origin);
}

export async function guessDuelRound(
  inviteCode: string,
  position: number,
  input: DuelGuessInput,
  clerkUserId: string,
  origin?: string,
) {
  const { duel, profile, round } = await participantRound(
    inviteCode,
    position,
    clerkUserId,
  );
  const attempt = attemptFor(round, profile.id);
  if (!attempt) throw new Error("Start this duel round first.");
  if (attempt.completedAt || attempt.givenUp)
    throw new Error("This round is complete.");
  if (!attempt.canGuess) throw new Error("Reveal a clue before guessing.");

  const entity = roundEntity(duel, round);
  const isCorrect = matchesEntityGuess(entity, input.guess);
  const revealed = asStrings(attempt.revealedClueKeys);
  const guesses = asGuesses(attempt.guesses);
  const snapshot = isCorrect ? null : await getLatestSnapshot();
  const mapData = snapshot
    ? getGuessedCountryMapData(input.guess, entity, snapshot.entities)
    : null;
  const nextGuesses = [
    ...guesses,
    { name: mapData?.name ?? input.guess.trim(), mapData },
  ];
  const clues = effectiveClues(round, duel.mode as GameMode);

  if (isCorrect) {
    await updateDuelAttempt(attempt.id, profile.id, input.version, {
      guesses: nextGuesses as unknown as Prisma.InputJsonValue,
      score:
        input.method === "map"
          ? Math.floor(scoreForRevealCount(revealed.length) / 2)
          : scoreForRevealCount(revealed.length),
      isCorrect: true,
      completedAt: new Date(),
      canGuess: false,
    });
  } else if (duel.mode === "classic") {
    const nextClue = clues.find((clue) => !revealed.includes(clue.key));
    if (nextClue) {
      await updateDuelAttempt(attempt.id, profile.id, input.version, {
        guesses: nextGuesses as unknown as Prisma.InputJsonValue,
        revealedClueKeys: [...revealed, nextClue.key],
      });
    } else {
      await updateDuelAttempt(attempt.id, profile.id, input.version, {
        guesses: nextGuesses as unknown as Prisma.InputJsonValue,
        score: 0,
        isCorrect: false,
        completedAt: new Date(),
        canGuess: false,
      });
    }
  } else if (revealed.length < clues.length) {
    await updateDuelAttempt(attempt.id, profile.id, input.version, {
      guesses: nextGuesses as unknown as Prisma.InputJsonValue,
      canGuess: false,
    });
  } else {
    await updateDuelAttempt(attempt.id, profile.id, input.version, {
      guesses: nextGuesses as unknown as Prisma.InputJsonValue,
      score: 0,
      isCorrect: false,
      completedAt: new Date(),
      canGuess: false,
    });
  }

  await completeDuelIfReady(duel.id);
  return refreshView(inviteCode, profile.id, origin);
}

export async function giveUpDuelRound(
  inviteCode: string,
  position: number,
  version: number,
  clerkUserId: string,
  origin?: string,
) {
  const { duel, profile, round } = await participantRound(
    inviteCode,
    position,
    clerkUserId,
  );
  const attempt = attemptFor(round, profile.id);
  if (!attempt) throw new Error("Start this duel round first.");
  if (attempt.completedAt || attempt.givenUp)
    throw new Error("This round is complete.");
  await updateDuelAttempt(attempt.id, profile.id, version, {
    score: 0,
    isCorrect: false,
    completedAt: new Date(),
    givenUp: true,
    canGuess: false,
  });
  await completeDuelIfReady(duel.id);
  return refreshView(inviteCode, profile.id, origin);
}
