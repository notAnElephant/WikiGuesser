import { auth } from "@clerk/nextjs/server";
import { VStack } from "@astryxdesign/core/VStack";
import type { Metadata } from "next";

import { DuelCreator } from "@/src/components/duel/duel-creator";
import {
  buildCategorySummaries,
  getLatestSnapshot,
} from "@/src/lib/repository/snapshot-repository";
import { ACTIVE_GAME_CATEGORIES } from "@/src/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create a duel | WikiGuesser" };

export default async function CreateDuelPage() {
  const { userId } = await auth();
  const snapshot = await getLatestSnapshot();
  const categories = buildCategorySummaries(snapshot).filter((category) =>
    ACTIVE_GAME_CATEGORIES.includes(category.id),
  );

  return (
    <VStack className="mx-auto w-full max-w-2xl" padding={4} gap={5}>
      <DuelCreator categories={categories} isSignedIn={Boolean(userId)} />
    </VStack>
  );
}
