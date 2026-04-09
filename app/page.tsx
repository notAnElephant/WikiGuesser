import { GameShell } from "@/src/components/game-shell";
import { buildCategorySummaries, getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";
import { ACTIVE_GAME_CATEGORIES } from "@/src/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await getLatestSnapshot();
  const allCategories = buildCategorySummaries(snapshot);
  const categories = allCategories.filter((category) => ACTIVE_GAME_CATEGORIES.includes(category.id));
  const countryOptions = [...new Set(
    snapshot.entities.filter((entity) => entity.category === "countries").map((entity) => entity.canonicalAnswer),
  )].sort((left, right) => left.localeCompare(right));

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-3 pb-4 pt-24 sm:px-4 sm:pb-5 sm:pt-28">
      <GameShell categories={categories} countryOptions={countryOptions} />
    </main>
  );
}
