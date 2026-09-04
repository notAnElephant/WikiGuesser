"use client";

import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useActionState, useState } from "react";

import {
  type ProfileNameFormState,
  saveProfileName,
} from "@/app/profile-name/actions";
const initialState: ProfileNameFormState = { error: null, savedName: null };

export function ProfileNameForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, isPending] = useActionState(
    saveProfileName,
    initialState,
  );
  const [profileName, setProfileName] = useState(defaultName);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <TextInput
          description="This is the name other players will see on the leaderboard."
          hasAutoFocus
          htmlName="profileName"
          isRequired
          label="Profile name"
          onChange={(value) => setProfileName(value.slice(0, 50))}
          size="lg"
          status={
            state.error ? { message: state.error, type: "error" } : undefined
          }
          type="text"
          value={profileName}
          width="100%"
        />
      </div>

      <Button
        isLoading={isPending}
        label="Continue"
        type="submit"
        variant="primary"
        width="100%"
      />
    </form>
  );
}
