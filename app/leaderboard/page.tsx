import { DailyLeaderboardShell } from "@/src/components/daily-leaderboard-shell";
import { getDailyLeaderboardPageData } from "@/src/lib/repository/daily-repository";
import {
  buildCategorySummaries,
  getLatestSnapshot,
} from "@/src/lib/repository/snapshot-repository";
import { ACTIVE_GAME_CATEGORIES } from "@/src/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [snapshot, data] = await Promise.all([
    getLatestSnapshot(),
    getDailyLeaderboardPageData(),
  ]);
  const categories = buildCategorySummaries(snapshot).filter((category) =>
    ACTIVE_GAME_CATEGORIES.includes(category.id),
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-3 pb-4 pt-24 sm:px-4 sm:pb-5 sm:pt-28">
      <DailyLeaderboardShell
        categories={categories}
        data={data}
        initialMode={data.defaultMode}
        initialPeriod="today"
      />
    </main>
  );
}
