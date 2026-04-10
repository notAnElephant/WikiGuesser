import { Prisma } from "@prisma/client";
import type {
  DailyChallenge,
  DailyResult,
  UserDailyCategoryModeStats,
} from "@prisma/client";

import { getClerkUserIdFromActorId } from "@/src/lib/auth/actor";
import { getClerkProfileSnapshot } from "@/src/lib/auth/user-profile";
import { getDailyComboKey, getDailyDayKey, selectDailyChallengeEntity } from "@/src/lib/game/daily";
import { buildNextDailyCategoryModeStats } from "@/src/lib/game/player-stats";
import { getPrismaClient } from "@/src/lib/repository/prisma";
import { getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";
import type {
  DailyChallengeCard,
  DailyChallengeOption,
  DailyComboLeaderboard,
  DailyHomeData,
  DailyLandingData,
  DailyLeaderboardEntry,
  DailyLeaderboardPageData,
  EntityCategory,
  NormalizedEntity,
  GameMode,
  MaterializedSnapshot,
} from "@/src/lib/types";
import { ACTIVE_GAME_CATEGORIES, GAME_MODES } from "@/src/lib/types";
const DAILY_LEADERBOARD_LIMIT = 10;

function getDefaultDailySelection<
  T extends {
    category: EntityCategory;
    mode: GameMode;
    playerStatus: { hasPlayed: boolean };
  },
>(options: T[]) {
  return (
    options.find((option) => !option.playerStatus.hasPlayed) ??
    options.find(
      (option) =>
        option.category === "countries" && option.mode === "classic",
    ) ??
    options[0]!
  );
}

async function buildDailyOptions(
  actorId: string | null,
  dayKey: string,
): Promise<DailyChallengeOption[]> {
  const options: DailyChallengeOption[] = [];
  const snapshot = await getLatestSnapshot();

  for (const category of ACTIVE_GAME_CATEGORIES) {
    for (const mode of GAME_MODES) {
      const challenge = await getOrCreateChallengeForDay(
        category,
        mode,
        dayKey,
        snapshot,
      );
      options.push({
        challengeId: challenge.id,
        dayKey: challenge.dayKey,
        category,
        mode,
        playerStatus: {
          hasPlayed: false,
          score: null,
          completedAt: null,
        },
      });
    }
  }

  if (!actorId) {
    return options;
  }

  const prisma = getPrismaClient();
  const results = await prisma.dailyResult.findMany({
    where: {
      playerKey: actorId,
      dailyChallengeId: {
        in: options.map((option) => option.challengeId),
      },
    },
    select: {
      dailyChallengeId: true,
      score: true,
      completedAt: true,
    },
  });
  const resultByChallengeId = new Map(
    results.map((result) => [result.dailyChallengeId, result]),
  );

  for (const option of options) {
    const result = resultByChallengeId.get(option.challengeId);

    if (!result) {
      continue;
    }

    option.playerStatus = {
      hasPlayed: true,
      score: result.score,
      completedAt: result.completedAt.toISOString(),
    };
  }

  return options;
}

async function buildLeaderboardByCombo(dayKey: string) {
  const leaderboardByCombo: Record<string, DailyComboLeaderboard> = {};

  for (const category of ACTIVE_GAME_CATEGORIES) {
    for (const mode of GAME_MODES) {
      const comboKey = getDailyComboKey(category, mode);
      leaderboardByCombo[comboKey] = {
        today: await buildTodayLeaderboard(category, mode, dayKey),
        total: await buildTotalLeaderboard(category, mode),
      };
    }
  }

  return leaderboardByCombo;
}

function toDailyEntity(challenge: DailyChallenge): NormalizedEntity {
  return {
    id: challenge.entityId,
    qid: challenge.entityQid,
    category: challenge.category as EntityCategory,
    canonicalAnswer: challenge.canonicalAnswer,
    wikipediaTitle: null,
    acceptedAnswers:
      challenge.acceptedAnswers as unknown as NormalizedEntity["acceptedAnswers"],
    clues: challenge.clues as unknown as NormalizedEntity["clues"],
    metadata:
      (challenge.metadata ?? {}) as unknown as NormalizedEntity["metadata"],
    sourceFingerprint: challenge.snapshotKey,
  };
}

async function upsertUserProfile(
  tx: Prisma.TransactionClient,
  clerkUserId: string,
  profileSnapshot: { displayName: string; imageUrl: string | null },
) {
  return tx.userProfile.upsert({
    where: {
      clerkUserId,
    },
    update: profileSnapshot,
    create: {
      clerkUserId,
      ...profileSnapshot,
    },
    select: {
      id: true,
      displayName: true,
      imageUrl: true,
    },
  });
}

function toLeaderboardEntry(params: {
  playerKey: string;
  displayName: string | null;
  imageUrl: string | null;
  score: number;
  roundsWon?: number;
  bestScore?: number;
  completedAt?: Date | null;
}): DailyLeaderboardEntry {
  return {
    playerKey: params.playerKey,
    displayName: params.displayName?.trim() || "Player",
    imageUrl: params.imageUrl,
    score: params.score,
    roundsWon: params.roundsWon,
    bestScore: params.bestScore,
    completedAt: params.completedAt?.toISOString() ?? null,
  };
}

async function getOrCreateChallengeForDay(
  category: EntityCategory,
  mode: GameMode,
  dayKey: string,
  snapshot?: MaterializedSnapshot,
) {
  const prisma = getPrismaClient();
  const activeSnapshot = snapshot ?? (await getLatestSnapshot());
  const entity = selectDailyChallengeEntity(
    activeSnapshot.entities,
    dayKey,
    category,
    mode,
  );

  return prisma.dailyChallenge.upsert({
    where: {
      dayKey_category_mode: {
        dayKey,
        category,
        mode,
      },
    },
    update: {},
    create: {
      dayKey,
      category,
      mode,
      snapshotKey: activeSnapshot.key,
      entityId: entity.id,
      entityQid: entity.qid,
      canonicalAnswer: entity.canonicalAnswer,
      acceptedAnswers:
        entity.acceptedAnswers as unknown as Prisma.InputJsonValue,
      clues: entity.clues as unknown as Prisma.InputJsonValue,
      metadata: entity.metadata as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function getOrCreateDailyChallenge(
  category: EntityCategory,
  mode: GameMode,
  dayKey = getDailyDayKey(),
) {
  return getOrCreateChallengeForDay(category, mode, dayKey);
}

export async function getDailyEntityForChallenge(challengeId: string) {
  const prisma = getPrismaClient();
  const challenge = await prisma.dailyChallenge.findUnique({
    where: {
      id: challengeId,
    },
  });

  if (!challenge) {
    throw new Error("That daily challenge no longer exists.");
  }

  return {
    challenge,
    entity: toDailyEntity(challenge),
  };
}

export async function findDailyResultForActor(
  dailyChallengeId: string,
  actorId: string,
) {
  const prisma = getPrismaClient();
  return prisma.dailyResult.findUnique({
    where: {
      dailyChallengeId_playerKey: {
        dailyChallengeId,
        playerKey: actorId,
      },
    },
  });
}

export async function recordCompletedDailyRound(input: {
  actorId: string;
  dailyChallengeId: string;
  category: EntityCategory;
  mode: GameMode;
  score: number;
  isCorrect: boolean;
  revealedClueCount: number;
  totalClues: number;
}): Promise<{ created: boolean; pendingClaimId: string | null }> {
  const prisma = getPrismaClient();
  const clerkUserId = getClerkUserIdFromActorId(input.actorId);
  const completedAt = new Date();
  const profileSnapshot = clerkUserId
    ? await getClerkProfileSnapshot(clerkUserId)
    : null;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.dailyResult.findUnique({
      where: {
        dailyChallengeId_playerKey: {
          dailyChallengeId: input.dailyChallengeId,
          playerKey: input.actorId,
        },
      },
    });

    if (existing) {
      return {
        created: false,
        pendingClaimId: existing.userProfileId ? null : existing.id,
      };
    }

    const userProfile =
      clerkUserId && profileSnapshot
        ? await upsertUserProfile(tx, clerkUserId, profileSnapshot)
        : null;
    const created = await tx.dailyResult.create({
      data: {
        dailyChallengeId: input.dailyChallengeId,
        playerKey: input.actorId,
        userProfileId: userProfile?.id,
        category: input.category,
        mode: input.mode,
        score: input.score,
        isCorrect: input.isCorrect,
        revealedClueCount: input.revealedClueCount,
        totalClues: input.totalClues,
        completedAt,
      },
    });

    if (userProfile) {
      const currentStats = await tx.userDailyCategoryModeStats.findUnique({
        where: {
          userProfileId_category_mode: {
            userProfileId: userProfile.id,
            category: input.category,
            mode: input.mode,
          },
        },
      });

      const nextStats = buildNextDailyCategoryModeStats(currentStats, {
        score: input.score,
        isCorrect: input.isCorrect,
        completedAt,
      });

      if (currentStats) {
        await tx.userDailyCategoryModeStats.update({
          where: {
            id: currentStats.id,
          },
          data: nextStats,
        });
      } else {
        await tx.userDailyCategoryModeStats.create({
          data: {
            userProfileId: userProfile.id,
            category: input.category,
            mode: input.mode,
            ...nextStats,
          },
        });
      }
    }

    return {
      created: true,
      pendingClaimId: userProfile ? null : created.id,
    };
  });
}

export async function claimPendingDailyResults(
  clerkUserId: string,
  pendingResultIds: string[],
) {
  if (pendingResultIds.length === 0) {
    return 0;
  }

  const prisma = getPrismaClient();
  const profileSnapshot = await getClerkProfileSnapshot(clerkUserId);
  const actorId = `user:${clerkUserId}`;

  return prisma.$transaction(async (tx) => {
    const userProfile = await upsertUserProfile(tx, clerkUserId, profileSnapshot);
    const results = await tx.dailyResult.findMany({
      where: {
        id: {
          in: pendingResultIds,
        },
        userProfileId: null,
      },
      orderBy: {
        completedAt: "asc",
      },
    });

    let claimedCount = 0;

    for (const result of results) {
      if (!result.playerKey.startsWith("guest:")) {
        continue;
      }

      const existingForUser = await tx.dailyResult.findUnique({
        where: {
          dailyChallengeId_playerKey: {
            dailyChallengeId: result.dailyChallengeId,
            playerKey: actorId,
          },
        },
      });

      if (existingForUser) {
        await tx.dailyResult.delete({
          where: {
            id: result.id,
          },
        });
        continue;
      }

      await tx.dailyResult.update({
        where: {
          id: result.id,
        },
        data: {
          playerKey: actorId,
          userProfileId: userProfile.id,
          claimedAt: new Date(),
        },
      });

      const currentStats = await tx.userDailyCategoryModeStats.findUnique({
        where: {
          userProfileId_category_mode: {
            userProfileId: userProfile.id,
            category: result.category,
            mode: result.mode,
          },
        },
      });
      const nextStats = buildNextDailyCategoryModeStats(currentStats, {
        score: result.score,
        isCorrect: result.isCorrect,
        completedAt: result.completedAt,
      });

      if (currentStats) {
        await tx.userDailyCategoryModeStats.update({
          where: {
            id: currentStats.id,
          },
          data: nextStats,
        });
      } else {
        await tx.userDailyCategoryModeStats.create({
          data: {
            userProfileId: userProfile.id,
            category: result.category,
            mode: result.mode,
            ...nextStats,
          },
        });
      }

      claimedCount += 1;
    }

    return claimedCount;
  });
}

async function buildTodayLeaderboard(
  category: EntityCategory,
  mode: GameMode,
  dayKey: string,
) {
  const prisma = getPrismaClient();
  const results = await prisma.dailyResult.findMany({
    where: {
      category,
      mode,
      userProfileId: {
        not: null,
      },
      dailyChallenge: {
        dayKey,
      },
    },
    include: {
      userProfile: true,
    },
    orderBy: [
      {
        score: "desc",
      },
      {
        completedAt: "asc",
      },
      {
        playerKey: "asc",
      },
    ],
    take: DAILY_LEADERBOARD_LIMIT,
  });

  return results.map((result) =>
    toLeaderboardEntry({
      playerKey: result.playerKey,
      displayName: result.userProfile?.displayName ?? null,
      imageUrl: result.userProfile?.imageUrl ?? null,
      score: result.score,
      completedAt: result.completedAt,
    }),
  );
}

async function buildTotalLeaderboard(category: EntityCategory, mode: GameMode) {
  const prisma = getPrismaClient();
  const stats = await prisma.userDailyCategoryModeStats.findMany({
    where: {
      category,
      mode,
    },
    include: {
      userProfile: true,
    },
    orderBy: [
      {
        totalScore: "desc",
      },
      {
        roundsWon: "desc",
      },
      {
        bestScore: "desc",
      },
      {
        userProfileId: "asc",
      },
    ],
    take: DAILY_LEADERBOARD_LIMIT,
  });

  return stats.map((entry) =>
    toLeaderboardEntry({
      playerKey: entry.userProfile.clerkUserId,
      displayName: entry.userProfile.displayName,
      imageUrl: entry.userProfile.imageUrl,
      score: entry.totalScore,
      roundsWon: entry.roundsWon,
      bestScore: entry.bestScore,
    }),
  );
}

export async function getDailyHomeData(
  actorId: string | null,
): Promise<DailyHomeData> {
  const landingData = await getDailyLandingData(actorId);
  const leaderboardByCombo = await buildLeaderboardByCombo(landingData.dayKey);

  return {
    dayKey: landingData.dayKey,
    cards: landingData.options,
    leaderboardByCombo,
    defaultCategory: landingData.defaultCategory,
    defaultMode: landingData.defaultMode,
  };
}

export async function getDailyLandingData(
  actorId: string | null,
): Promise<DailyLandingData> {
  const dayKey = getDailyDayKey();
  const options = await buildDailyOptions(actorId, dayKey);
  const defaultOption = getDefaultDailySelection(options);

  return {
    dayKey,
    options,
    defaultCategory: defaultOption.category,
    defaultMode: defaultOption.mode,
  };
}

export async function getDailyLeaderboardPageData(): Promise<DailyLeaderboardPageData> {
  const dayKey = getDailyDayKey();
  const leaderboardByCombo = await buildLeaderboardByCombo(dayKey);

  return {
    dayKey,
    leaderboardByCombo,
    defaultCategory: "countries",
    defaultMode: "classic",
  };
}

export type UserDailyCategoryModeStatsSnapshot = Pick<
  UserDailyCategoryModeStats,
  "roundsPlayed" | "roundsWon" | "totalScore" | "bestScore"
>;

export type DailyResultSnapshot = Pick<
  DailyResult,
  | "id"
  | "dailyChallengeId"
  | "playerKey"
  | "userProfileId"
  | "category"
  | "mode"
  | "score"
  | "isCorrect"
  | "completedAt"
>;
