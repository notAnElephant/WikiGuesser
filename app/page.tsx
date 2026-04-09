import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

import { DailyChallengeShell } from "@/src/components/daily-challenge-shell";
import { GameShell } from "@/src/components/game-shell";
import { getOptionalActorId } from "@/src/lib/auth/actor";
import { PENDING_DAILY_CLAIMS_COOKIE } from "@/src/lib/game/daily-claim-cookie";
import { getDailyHomeData } from "@/src/lib/repository/daily-repository";
import {
  buildCategorySummaries,
  getLatestSnapshot,
} from "@/src/lib/repository/snapshot-repository";
import { ACTIVE_GAME_CATEGORIES } from "@/src/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { userId } = await auth();
  const actorId = await getOptionalActorId();
  const cookieStore = await cookies();
  const snapshot = await getLatestSnapshot();
  const allCategories = buildCategorySummaries(snapshot);
  const categories = allCategories.filter((category) =>
    ACTIVE_GAME_CATEGORIES.includes(category.id),
  );
  const dailyHomeData = await getDailyHomeData(actorId);
  const countryOptions = [
    ...new Set(
      snapshot.entities
        .filter((entity) => entity.category === "countries")
        .map((entity) => entity.canonicalAnswer),
    ),
  ].sort((left, right) => left.localeCompare(right));
  const hasPendingClaim = Boolean(
    cookieStore.get(PENDING_DAILY_CLAIMS_COOKIE)?.value,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-3 pb-4 pt-24 sm:px-4 sm:pb-5 sm:pt-28">
      <div className="grid gap-6">
        <DailyChallengeShell
          countryOptions={countryOptions}
          data={dailyHomeData}
          hasPendingClaim={hasPendingClaim}
          isSignedIn={Boolean(userId)}
        />

        <section className="grid gap-3">
          <div className="px-1">
            <p className="m-0 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
              Free play
            </p>
          </div>
          <GameShell categories={categories} countryOptions={countryOptions} />
        </section>
      </div>
    </main>
  );
}
