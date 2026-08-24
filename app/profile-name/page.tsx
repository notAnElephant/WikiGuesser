import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ProfileNameForm } from "@/app/profile-name/profile-name-form";
import { surfaceClass } from "@/src/components/game-shell/config";
import { deriveDisplayName } from "@/src/lib/auth/user-profile";

export default async function ProfileNamePage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-24">
      <section className={`${surfaceClass} w-full max-w-md p-6 sm:p-8`}>
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
          One last step
        </p>
        <h1 className="m-0 mt-2 font-serif-display text-4xl font-semibold tracking-[-0.05em] text-[#1f1b17] dark:text-[#f5f7fb]">
          Choose your leaderboard name
        </h1>
        <p className="mb-6 mt-3 text-[0.98rem] leading-7 text-[#6b6259] dark:text-[#9aa9bb]">
          We filled this in from your Clerk profile. Change it if you would
          like.
        </p>

        <ProfileNameForm defaultName={deriveDisplayName(user)} />
      </section>
    </main>
  );
}
