import { currentUser } from "@clerk/nextjs/server";
import { Card } from "@astryxdesign/core/Card";
import { redirect } from "next/navigation";

import { ProfileNameForm } from "@/app/profile-name/profile-name-form";
import { deriveDisplayName } from "@/src/lib/auth/user-profile";

export default async function ProfileNamePage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-24">
      <Card className="w-full max-w-md p-6 sm:p-8" elevation="low" padding={0}>
        <p className="m-0 text-xs font-semibold uppercase tracking-wider text-accent">
          One last step
        </p>
        <h1 className="m-0 mt-2 font-heading text-4xl font-semibold tracking-tight text-primary">
          Choose your leaderboard name
        </h1>
        <p className="mb-6 mt-3 text-base leading-7 text-secondary">
          We filled this in from your Clerk profile. Change it if you would
          like.
        </p>

        <ProfileNameForm defaultName={deriveDisplayName(user)} />
      </Card>
    </main>
  );
}
