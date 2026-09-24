import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

import { SharedLandingShell } from "@/src/components/shared-landing-shell";
import { getOptionalActorId } from "@/src/lib/auth/actor";
import { isAdminUser } from "@/src/lib/auth/admin";
import { buildContinentOptions } from "@/src/lib/content/continents";
import { PENDING_DAILY_CLAIMS_COOKIE } from "@/src/lib/game/daily-claim-cookie";
import type { GameRouteTarget } from "@/src/lib/game/game-routes";
import { getDailyLandingData } from "@/src/lib/repository/daily-repository";
import {
  buildCategorySummaries,
  getLatestSnapshot,
} from "@/src/lib/repository/snapshot-repository";
import { ACTIVE_GAME_CATEGORIES } from "@/src/lib/types";

interface LandingPageProps {
  initialGame?: GameRouteTarget;
}

export async function LandingPage({ initialGame }: LandingPageProps) {
  const { userId } = await auth();
  const actorId = await getOptionalActorId();
  const cookieStore = await cookies();
  const snapshot = await getLatestSnapshot();
  const allCategories = buildCategorySummaries(snapshot);
  const categories = allCategories.filter((category) =>
    ACTIVE_GAME_CATEGORIES.includes(category.id),
  );
  const dailyLandingData = await getDailyLandingData(actorId);
  const countryOptions = [
    ...new Set(
      snapshot.entities
        .filter((entity) => entity.category === "countries")
        .map((entity) => entity.canonicalAnswer),
    ),
  ].sort((left, right) => left.localeCompare(right));
  const continentOptions = buildContinentOptions(snapshot.entities);
  const hasPendingClaim = Boolean(
    cookieStore.get(PENDING_DAILY_CLAIMS_COOKIE)?.value,
  );

  return (
    <section className="mx-auto w-full max-w-6xl px-3 pb-4 pt-4 sm:px-4 sm:pb-5 sm:pt-5 has-[[data-game-play]]:max-w-none">
      <SharedLandingShell
        categories={categories}
        continentOptions={continentOptions}
        countryOptions={countryOptions}
        dailyData={dailyLandingData}
        hasPendingClaim={hasPendingClaim}
        initialGame={initialGame}
        isAdmin={isAdminUser(userId)}
        isSignedIn={Boolean(userId)}
      />
    </section>
  );
}
