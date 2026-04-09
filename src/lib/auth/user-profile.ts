import { clerkClient } from "@clerk/nextjs/server";

export interface ClerkProfileSnapshot {
  displayName: string;
  imageUrl: string | null;
}

function deriveDisplayName(user: {
  fullName?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
}) {
  const nameFromParts = [user.firstName, user.lastName]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim();
  const emailLocalPart = user.primaryEmailAddress?.emailAddress?.split("@")[0];

  return (
    user.fullName?.trim() ||
    user.username?.trim() ||
    nameFromParts ||
    emailLocalPart ||
    "Player"
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
