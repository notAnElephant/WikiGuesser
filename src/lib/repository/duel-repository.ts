import { Prisma, type DuelAttempt, type DuelStatus } from "@prisma/client";

import { getClerkProfileSnapshot } from "@/src/lib/auth/user-profile";
import { getPrismaClient } from "@/src/lib/repository/prisma";

const duelDetails = {
  rounds: {
    orderBy: { position: "asc" as const },
    include: { snapshotEntity: true, attempts: true },
  },
  challenger: true,
  opponent: true,
  snapshotVersion: true,
} satisfies Prisma.DuelInclude;

export type DuelWithDetails = Prisma.DuelGetPayload<{
  include: typeof duelDetails;
}>;

export type CreateDuelInput = {
  inviteCode: string;
  category: string;
  mode: string;
  roundCount: 3 | 5 | 10;
  snapshotVersionId?: string;
  snapshotKey: string;
  challengerId: string;
  expiresAt: Date;
  rounds: Array<{
    snapshotEntityId?: string;
    entityQid: string;
    canonicalAnswer: string;
    acceptedAnswers: Prisma.InputJsonValue;
    clues: Prisma.InputJsonValue;
    metadata?: Prisma.InputJsonValue;
  }>;
};

export type UpdateDuelAttemptInput = {
  revealedClueKeys?: Prisma.InputJsonValue;
  guesses?: Prisma.InputJsonValue;
  canGuess?: boolean;
  score?: number | null;
  isCorrect?: boolean | null;
  completedAt?: Date | null;
  givenUp?: boolean;
};

export async function ensureDuelUserProfile(clerkUserId: string) {
  const prisma = getPrismaClient();
  const existing = await prisma.userProfile.findUnique({
    where: { clerkUserId },
    select: { id: true, clerkUserId: true, displayName: true, imageUrl: true },
  });
  if (existing) return existing;

  const profile = await getClerkProfileSnapshot(clerkUserId);
  return prisma.userProfile.upsert({
    where: { clerkUserId },
    update: profile,
    create: { clerkUserId, ...profile },
    select: { id: true, clerkUserId: true, displayName: true, imageUrl: true },
  });
}

export async function createDuel(
  input: CreateDuelInput,
): Promise<DuelWithDetails> {
  if (input.rounds.length !== input.roundCount) {
    throw new Error("A duel must contain one entity for every round.");
  }

  const prisma = getPrismaClient();
  const duel = await prisma.duel.create({
    data: {
      inviteCode: input.inviteCode,
      category: input.category,
      mode: input.mode,
      roundCount: input.roundCount,
      snapshotVersionId: input.snapshotVersionId,
      snapshotKey: input.snapshotKey,
      challengerId: input.challengerId,
      expiresAt: input.expiresAt,
      rounds: {
        create: input.rounds.map((round, index) => ({
          position: index + 1,
          snapshotEntityId: round.snapshotEntityId,
          entityQid: round.entityQid,
          canonicalAnswer: round.canonicalAnswer,
          acceptedAnswers: round.acceptedAnswers,
          clues: round.clues,
          metadata: round.metadata,
        })),
      },
    },
    include: duelDetails,
  });

  return duel;
}

export async function getDuelByInviteCode(
  inviteCode: string,
): Promise<DuelWithDetails | null> {
  const prisma = getPrismaClient();
  return prisma.duel.findUnique({
    where: { inviteCode },
    include: duelDetails,
  });
}

export async function getOrRefreshDuelByInviteCode(inviteCode: string) {
  const duel = await getDuelByInviteCode(inviteCode);
  if (!duel || duel.expiresAt > new Date() || duel.status === "EXPIRED") {
    return duel;
  }

  await markExpiredDuels();
  return getDuelByInviteCode(inviteCode);
}

export async function getDuelForParticipant(
  duelId: string,
  userProfileId: string,
): Promise<DuelWithDetails | null> {
  const prisma = getPrismaClient();
  return prisma.duel.findFirst({
    where: {
      id: duelId,
      OR: [{ challengerId: userProfileId }, { opponentId: userProfileId }],
    },
    include: duelDetails,
  });
}

/** Atomically claims the opponent slot and starts an invited duel. */
export async function acceptDuel(
  inviteCode: string,
  opponentId: string,
): Promise<DuelWithDetails> {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    const duel = await tx.duel.findUnique({
      where: { inviteCode },
      select: { id: true, challengerId: true },
    });

    if (!duel) {
      throw new Error("That duel invitation does not exist.");
    }
    if (duel.challengerId === opponentId) {
      throw new Error("You cannot accept your own duel invitation.");
    }

    const claimed = await tx.duel.updateMany({
      where: {
        id: duel.id,
        status: "INVITED",
        opponentId: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        opponentId,
        status: "ACTIVE",
        startedAt: new Date(),
      },
    });

    if (claimed.count !== 1) {
      const current = await tx.duel.findUnique({
        where: { id: duel.id },
        select: { status: true, expiresAt: true },
      });
      throw new Error(
        current?.status === "EXPIRED" ||
          (current && current.expiresAt <= new Date())
          ? "This duel invitation has expired."
          : "This duel invitation is no longer available.",
      );
    }

    return tx.duel.findUniqueOrThrow({
      where: { id: duel.id },
      include: duelDetails,
    });
  });
}

export async function getOrCreateDuelAttempt(
  duelRoundId: string,
  userProfileId: string,
  initial?: Pick<UpdateDuelAttemptInput, "revealedClueKeys" | "canGuess">,
): Promise<DuelAttempt> {
  const prisma = getPrismaClient();
  return prisma.duelAttempt.upsert({
    where: { duelRoundId_userProfileId: { duelRoundId, userProfileId } },
    create: {
      duelRoundId,
      userProfileId,
      revealedClueKeys: initial?.revealedClueKeys ?? [],
      canGuess: initial?.canGuess ?? true,
    },
    update: {},
  });
}

/** Updates an attempt only when its version still matches the caller's version. */
export async function updateDuelAttempt(
  attemptId: string,
  userProfileId: string,
  expectedVersion: number,
  input: UpdateDuelAttemptInput,
): Promise<DuelAttempt> {
  const prisma = getPrismaClient();
  const updated = await prisma.duelAttempt.updateMany({
    where: { id: attemptId, userProfileId, version: expectedVersion },
    data: {
      ...input,
      version: { increment: 1 },
    },
  });

  if (updated.count !== 1) {
    throw new Error("That duel attempt changed; reload and try again.");
  }

  return prisma.duelAttempt.findUniqueOrThrow({ where: { id: attemptId } });
}

export async function markExpiredDuels(now = new Date()): Promise<number> {
  const prisma = getPrismaClient();
  const result = await prisma.duel.updateMany({
    where: {
      status: { in: ["INVITED", "ACTIVE"] satisfies DuelStatus[] },
      expiresAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });
  return result.count;
}

export async function updateDuelStatus(
  duelId: string,
  status: DuelStatus,
): Promise<DuelWithDetails> {
  const prisma = getPrismaClient();
  return prisma.duel.update({
    where: { id: duelId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : undefined,
    },
    include: duelDetails,
  });
}

/** Completes an active duel once both participants have finished every round. */
export async function completeDuelIfReady(duelId: string): Promise<boolean> {
  const prisma = getPrismaClient();
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    select: {
      status: true,
      challengerId: true,
      opponentId: true,
      rounds: {
        select: {
          id: true,
          attempts: {
            select: { userProfileId: true, completedAt: true, givenUp: true },
          },
        },
      },
    },
  });
  if (!duel || duel.status !== "ACTIVE" || !duel.opponentId) return false;

  const playerIds = [duel.challengerId, duel.opponentId];
  const ready = playerIds.every((playerId) =>
    duel.rounds.every((round) =>
      round.attempts.some(
        (attempt) =>
          attempt.userProfileId === playerId &&
          (attempt.completedAt !== null || attempt.givenUp),
      ),
    ),
  );
  if (!ready) return false;

  const result = await prisma.duel.updateMany({
    where: { id: duelId, status: "ACTIVE" },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  return result.count === 1;
}
