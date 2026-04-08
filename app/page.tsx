import { GameShell } from "@/src/components/game-shell";
import { getLatestSnapshot, listCategorySummaries } from "@/src/lib/repository/snapshot-repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [allCategories, snapshot] = await Promise.all([listCategorySummaries(), getLatestSnapshot()]);
  const categories = allCategories.filter((category) => category.id === "countries");
  const countryOptions = [...new Set(
    snapshot.entities.filter((entity) => entity.category === "countries").map((entity) => entity.canonicalAnswer),
  )].sort((left, right) => left.localeCompare(right));

  return (
    <main className="mx-auto min-h-screen w-full px-2 pb-2 pt-20 sm:px-3 sm:pb-3 sm:pt-24">
      <GameShell categories={categories} countryOptions={countryOptions} />
    </main>
  );
}
