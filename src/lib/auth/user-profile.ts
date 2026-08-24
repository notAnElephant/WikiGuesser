import { clerkClient } from "@clerk/nextjs/server";

export interface ClerkProfileSnapshot {
  displayName: string;
  imageUrl: string | null;
}

const LEADERBOARD_NAME_METADATA_KEY = "leaderboardName";

interface ClerkProfileLike {
  fullName?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  publicMetadata?: unknown;
}

function getLeaderboardNameFromMetadata(publicMetadata: unknown) {
  if (
    !publicMetadata ||
    typeof publicMetadata !== "object" ||
    !(LEADERBOARD_NAME_METADATA_KEY in publicMetadata)
  ) {
    return null;
  }

  const value = (publicMetadata as Record<string, unknown>)[
    LEADERBOARD_NAME_METADATA_KEY
  ];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function deriveLeaderboardNameDefault(user: ClerkProfileLike) {
  const nameFromParts = [user.firstName, user.lastName]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim();
  const emailLocalPart = user.primaryEmailAddress?.emailAddress?.split("@")[0];

  return (
    nameFromParts ||
    user.fullName?.trim() ||
    user.username?.trim() ||
    emailLocalPart ||
    "Player"
  );
}

export function deriveDisplayName(user: ClerkProfileLike) {
  return (
    getLeaderboardNameFromMetadata(user.publicMetadata) ||
    deriveLeaderboardNameDefault(user)
  );
}

export async function getClerkProfileSnapshot(
  clerkUserId: string,
): Promise<ClerkProfileSnapshot> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);

    return {
      displayName: deriveDisplayName(user),
      imageUrl: user.imageUrl ?? null,
    };
  } catch {
    return {
      displayName: "Player",
      imageUrl: null,
    };
  }
}
