"use server";

import { auth, currentUser } from "@clerk/nextjs/server";

import { deriveDisplayName } from "@/src/lib/auth/user-profile";
import { getPrismaClient } from "@/src/lib/repository/prisma";

export async function syncLeaderboardUsername(expectedUsername: string) {
  const { userId } = await auth();
  if (!userId || typeof expectedUsername !== "string") return;

  const profiles = getPrismaClient().userProfile;
  const profile = await profiles.findUnique({
    where: { clerkUserId: userId },
    select: { displayName: true },
  });
  if (!profile || profile.displayName?.toLowerCase() === expectedUsername) return;

  const user = await currentUser();
  if (user?.username !== expectedUsername) return;

  await profiles.updateMany({
    where: { clerkUserId: userId, displayName: profile.displayName },
    data: { displayName: deriveDisplayName(user) },
  });
}
