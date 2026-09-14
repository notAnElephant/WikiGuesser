import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PlayerStatsShell } from "@/src/components/player-stats-shell";
import { getPlayerStatsPageData } from "@/src/lib/repository/game-stats-repository";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/stats");
  }

  const data = await getPlayerStatsPageData(userId);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-3 pb-4 pt-24 sm:px-4 sm:pb-5 sm:pt-28">
      <PlayerStatsShell data={data} />
    </main>
  );
}
