"use client";

import { useActionState } from "react";

import {
  type ProfileNameFormState,
  saveProfileName,
} from "@/app/profile-name/actions";
import { primaryButtonClass } from "@/src/components/game-shell/config";

const initialState: ProfileNameFormState = { error: null, savedName: null };

export function ProfileNameForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, isPending] = useActionState(
    saveProfileName,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <label
          className="text-sm font-semibold text-[#1f1b17] dark:text-[#f5f7fb]"
          htmlFor="profileName"
        >
          Profile name
        </label>
        <input
          aria-describedby="profile-name-help profile-name-error"
          autoComplete="nickname"
          autoFocus
          className="w-full rounded-2xl border border-black/10 bg-white/84 px-4 py-3 text-base text-[#1f1b17] outline-none transition placeholder:text-[#9a9188] focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15 dark:border-white/12 dark:bg-white/7 dark:text-[#f5f7fb] dark:focus:border-[#24d4c2] dark:focus:ring-[#24d4c2]/15"
          defaultValue={defaultName}
          id="profileName"
          maxLength={50}
          name="profileName"
          required
          type="text"
        />
        <p
          className="m-0 text-sm leading-6 text-[#6b6259] dark:text-[#9aa9bb]"
          id="profile-name-help"
        >
          This is the name other players will see on the leaderboard.
        </p>
        {state.error ? (
          <p
            aria-live="polite"
            className="m-0 text-sm font-medium text-red-700 dark:text-red-300"
            id="profile-name-error"
          >
            {state.error}
          </p>
        ) : null}
      </div>

      <button className={primaryButtonClass} disabled={isPending} type="submit">
        {isPending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
