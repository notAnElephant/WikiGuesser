"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getPrismaClient } from "@/src/lib/repository/prisma";

const leaderboardNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a profile name.")
  .max(50, "Profile name must be 50 characters or fewer.");

export interface ProfileNameFormState {
  error: string | null;
  savedName: string | null;
}

async function updateProfileName(
  formData: FormData,
): Promise<ProfileNameFormState> {
  const { userId } = await auth();

  if (!userId) {
    return {
      error: "Sign in to choose a leaderboard name.",
      savedName: null,
    };
  }

  const parsedName = leaderboardNameSchema.safeParse(
    formData.get("profileName"),
  );

  if (!parsedName.success) {
    return {
      error: parsedName.error.issues[0]?.message ?? "Invalid name.",
      savedName: null,
    };
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      leaderboardName: parsedName.data,
    },
  });

  const prisma = getPrismaClient();
  await prisma.userProfile.updateMany({
    where: { clerkUserId: userId },
    data: { displayName: parsedName.data },
  });

  return { error: null, savedName: parsedName.data };
}

export async function saveProfileName(
  _previousState: ProfileNameFormState,
  formData: FormData,
): Promise<ProfileNameFormState> {
  const result = await updateProfileName(formData);

  if (result.error) {
    return result;
  }

  redirect("/");
}

export async function saveProfileNameInline(
  _previousState: ProfileNameFormState,
  formData: FormData,
) {
  return updateProfileName(formData);
}
