import { randomUUID } from "node:crypto";
import type { FriendChallengeAttempt, Prisma } from "@prisma/client";

import { getPrismaClient } from "@/src/lib/repository/prisma";

export function createChallenge(data: Prisma.FriendChallengeCreateInput) {
  return getPrismaClient().friendChallenge.create({ data });
}

export function findChallenge(code: string) {
  return getPrismaClient().friendChallenge.findUnique({ where: { code } });
}

export function findChallengeAttempt(challengeId: string, actorId: string) {
  return getPrismaClient().friendChallengeAttempt.findUnique({
    where: { challengeId_actorId: { challengeId, actorId } },
  });
}

export async function startChallengeAttempt(
  challengeId: string,
  actorId: string,
  revealedClueKeys: string[],
  canGuess: boolean,
  replayNoticeShown: boolean,
) {
  const id = randomUUID();
  const attempt = await getPrismaClient().friendChallengeAttempt.upsert({
    where: { challengeId_actorId: { challengeId, actorId } },
    update: {},
    create: {
      id,
      challengeId,
      actorId,
      revealedClueKeys,
      canGuess,
      replayStatus: replayNoticeShown ? "PENDING" : null,
    },
  });
  return { attempt, created: attempt.id === id };
}

export type ChallengeAttemptUpdate = Pick<
  FriendChallengeAttempt,
  "canGuess" | "score" | "isCorrect" | "completedAt" | "replayStatus"
> & {
  revealedClueKeys: string[];
  guesses: Prisma.InputJsonValue;
};

export function findCompletedChallengeReplays(
  challengeId: string,
  id?: string,
) {
  return getPrismaClient().friendChallengeAttempt.findMany({
    where: {
      challengeId,
      id,
      completedAt: { not: null },
      replayStatus: { in: ["SOLVED", "GAVE_UP", "OUT_OF_CLUES"] },
    },
    orderBy: [{ completedAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      actorId: true,
      completedAt: true,
      score: true,
      replayStatus: true,
      guesses: true,
      ...(id !== undefined ? { revealedClueKeys: true } : {}),
    },
  });
}

export async function updateChallengeAttempt(
  attempt: FriendChallengeAttempt,
  data: ChallengeAttemptUpdate,
) {
  const result = await getPrismaClient().friendChallengeAttempt.updateMany({
    where: {
      id: attempt.id,
      actorId: attempt.actorId,
      version: attempt.version,
      completedAt: null,
    },
    data: { ...data, version: { increment: 1 } },
  });
  if (result.count !== 1) {
    throw new Error(
      "Your progress changed in another tab. Refresh to continue.",
    );
  }
}
