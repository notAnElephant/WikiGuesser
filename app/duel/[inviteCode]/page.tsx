import { DuelShell } from "@/src/components/duel/duel-shell";
import { getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";

interface DuelPageProps {
  params: Promise<{ inviteCode: string }>;
}

export const dynamic = "force-dynamic";

export default async function DuelPage({ params }: DuelPageProps) {
  const { inviteCode } = await params;
  const snapshot = await getLatestSnapshot();
  const countryOptions = snapshot.entities
    .filter((entity) => entity.category === "countries")
    .map((entity) => entity.canonicalAnswer)
    .sort((left, right) => left.localeCompare(right));

  return <DuelShell countryOptions={countryOptions} inviteCode={inviteCode} />;
}
