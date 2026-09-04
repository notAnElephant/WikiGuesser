import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { DuelShell } from "@/src/components/duel/duel-shell";

interface DuelPageProps {
  params: Promise<{ inviteCode: string }>;
}

export const dynamic = "force-dynamic";

export default async function DuelPage({ params }: DuelPageProps) {
  const { userId } = await auth();
  const { inviteCode } = await params;

  if (!userId) {
    redirect(
      `/sign-in?redirect_url=${encodeURIComponent(`/duel/${inviteCode}`)}`,
    );
  }

  return <DuelShell inviteCode={inviteCode} />;
}
