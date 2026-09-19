import { DailyLeaderboardShell } from "@/src/components/daily-leaderboard-shell";
import { getDailyLeaderboardPageData } from "@/src/lib/repository/daily-repository";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const data = await getDailyLeaderboardPageData();

  return (
    <section className="mx-auto w-full max-w-4xl px-3 pb-4 pt-4 sm:px-4 sm:pb-5 sm:pt-5">
      <DailyLeaderboardShell
        data={data}
        initialMode={data.defaultMode}
        initialPeriod="today"
      />
    </section>
  );
}
