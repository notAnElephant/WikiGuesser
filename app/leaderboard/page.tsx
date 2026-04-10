import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  // Temporarily disabled while the leaderboard is being redesigned.
  redirect("/");
}
