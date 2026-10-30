"use client";

import { useUser } from "@clerk/nextjs";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useActionState, useEffect, useState } from "react";

import {
  type ProfileNameFormState,
  saveProfileNameInline,
} from "@/app/profile-name/actions";

const initialState: ProfileNameFormState = { error: null, savedName: null };

function getDefaultName(user: NonNullable<ReturnType<typeof useUser>["user"]>) {
  const leaderboardName = user.publicMetadata.leaderboardName;
  const nameFromParts = [user.firstName, user.lastName]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim();

  if (typeof leaderboardName === "string" && leaderboardName.trim()) {
    return leaderboardName.trim();
  }

  return (
    nameFromParts ||
    user.fullName?.trim() ||
    user.username?.trim() ||
    user.primaryEmailAddress?.emailAddress.split("@")[0] ||
    "Player"
  );
}

export function LeaderboardProfilePage() {
  const { user } = useUser();
  const [state, formAction, isPending] = useActionState(
    saveProfileNameInline,
    initialState,
  );
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (user) setDisplayName(getDefaultName(user));
  }, [user]);

  useEffect(() => {
    if (state.savedName) {
      void user?.reload();
    }
  }, [state.savedName, user]);

  if (!user) {
    return null;
  }

  return (
    <div className="w-full max-w-xl p-1 text-primary">
      <h1 className="m-0 text-2xl font-bold tracking-tight">
        Leaderboard name
      </h1>
      <p className="mb-6 mt-2 text-sm leading-6 text-secondary">
        Choose the name other players will see beside your scores.
      </p>

      <form action={formAction} className="grid gap-5">
        <div className="grid gap-2">
          <TextInput
            description="Up to 50 characters. This does not change your Clerk account name."
            htmlName="profileName"
            isRequired
            label="Display name"
            onChange={(value) => setDisplayName(value.slice(0, 50))}
            size="lg"
            status={
              state.error ? { message: state.error, type: "error" } : undefined
            }
            value={displayName}
            width="100%"
          />
          <div aria-live="polite" id="leaderboard-name-status">
            {state.error ? (
              <p className="m-0 text-sm font-medium text-error">
                {state.error}
              </p>
            ) : state.savedName ? (
              <p className="m-0 text-sm font-medium text-accent">
                Leaderboard name saved.
              </p>
            ) : null}
          </div>
        </div>

        <Button
          isLoading={isPending}
          label="Save changes"
          type="submit"
          variant="primary"
        />
      </form>
    </div>
  );
}
