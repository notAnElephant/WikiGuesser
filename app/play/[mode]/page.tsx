import { notFound } from "next/navigation";

import { LandingPage } from "@/src/components/landing-page";
import { parseGameModeSlug } from "@/src/lib/game/game-routes";

export const dynamic = "force-dynamic";

export default async function FreePlayGamePage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  const initialGame = parseGameModeSlug("play", mode);

  if (!initialGame) {
    notFound();
  }

  return <LandingPage initialGame={initialGame} />;
}
