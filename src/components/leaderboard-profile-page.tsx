"use client";

import { useUser } from "@clerk/nextjs";
import { useActionState, useEffect } from "react";

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

  useEffect(() => {
    if (state.savedName) {
      void user?.reload();
    }
  }, [state.savedName, user]);

  if (!user) {
    return null;
  }

  return (
    <div className="w-full max-w-xl p-1 text-[#1f1b17] dark:text-[#f5f7fb]">
      <h1 className="m-0 text-2xl font-bold tracking-[-0.025em]">
        Leaderboard name
      </h1>
      <p className="mb-6 mt-2 text-sm leading-6 text-[#6b6259] dark:text-[#9aa9bb]">
        Choose the name other players will see beside your scores.
      </p>

      <form action={formAction} className="grid gap-5">
        <div className="grid gap-2">
          <label className="text-sm font-semibold" htmlFor="leaderboardName">
            Display name
          </label>
          <input
            aria-describedby="leaderboard-name-help leaderboard-name-status"
            autoComplete="nickname"
            className="w-full rounded-xl border border-black/12 bg-white px-3.5 py-2.5 text-sm text-[#1f1b17] outline-none transition focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15 dark:border-white/15 dark:bg-white/8 dark:text-[#f5f7fb] dark:focus:border-[#24d4c2]"
            defaultValue={getDefaultName(user)}
            id="leaderboardName"
            maxLength={50}
            name="profileName"
            required
            type="text"
          />
          <p
            className="m-0 text-xs leading-5 text-[#6b6259] dark:text-[#9aa9bb]"
            id="leaderboard-name-help"
          >
            Up to 50 characters. This does not change your Clerk account name.
          </p>
          <div aria-live="polite" id="leaderboard-name-status">
            {state.error ? (
              <p className="m-0 text-sm font-medium text-red-700 dark:text-red-300">
                {state.error}
              </p>
            ) : state.savedName ? (
              <p className="m-0 text-sm font-medium text-[#0f766e] dark:text-[#75e6d7]">
                Leaderboard name saved.
              </p>
            ) : null}
          </div>
        </div>

        <button
          className="inline-flex min-h-10 w-fit items-center justify-center rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-wait disabled:opacity-60 dark:bg-[#24d4c2] dark:text-[#082825] dark:hover:bg-[#75e6d7]"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
