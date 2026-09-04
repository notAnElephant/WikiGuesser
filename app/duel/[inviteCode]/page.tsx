import { DuelShell } from "@/src/components/duel/duel-shell";

interface DuelPageProps {
  params: Promise<{ inviteCode: string }>;
}

export const dynamic = "force-dynamic";

export default async function DuelPage({ params }: DuelPageProps) {
  const { inviteCode } = await params;
  return <DuelShell inviteCode={inviteCode} />;
}
