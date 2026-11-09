import type { Metadata } from "next";
import { VStack } from "@astryxdesign/core/VStack";

import { ChallengeShell } from "@/src/components/challenge/challenge-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "A country challenge for you | WikiGuesser",
  description: "A friend picked a mystery country. Can you guess it?",
  robots: { index: false, follow: false },
  openGraph: {
    title: "A country challenge for you | WikiGuesser",
    description: "A friend picked a mystery country. Can you guess it?",
  },
};

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <VStack padding={4}>
      <ChallengeShell code={code} />
    </VStack>
  );
}
