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

export function startChallengeAttempt(
  challengeId: string,
  actorId: string,
  revealedClueKeys: string[],
  canGuess: boolean,
) {
  return getPrismaClient().friendChallengeAttempt.upsert({
    where: { challengeId_actorId: { challengeId, actorId } },
    update: {},
    create: { challengeId, actorId, revealedClueKeys, canGuess },
  });
}

export type ChallengeAttemptUpdate = Pick<
  FriendChallengeAttempt,
  "canGuess" | "score" | "isCorrect" | "completedAt"
> & {
  revealedClueKeys: string[];
  guesses: Prisma.InputJsonValue;
};

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
