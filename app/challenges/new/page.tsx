import type { Metadata } from "next";
import { VStack } from "@astryxdesign/core/VStack";

import { ChallengeCreator } from "@/src/components/challenge/challenge-creator";
import { getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create a challenge | WikiGuesser" };

export default async function CreateChallengePage() {
  const snapshot = await getLatestSnapshot();
  const countryOptions = snapshot.entities
    .filter((entity) => entity.category === "countries")
    .map((entity) => entity.canonicalAnswer)
    .sort((left, right) => left.localeCompare(right));

  return (
    <VStack className="mx-auto w-full max-w-2xl" padding={4} gap={5}>
      <ChallengeCreator countryOptions={countryOptions} />
    </VStack>
  );
}
