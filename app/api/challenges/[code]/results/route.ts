import { NextResponse } from "next/server";

import { getOptionalActorId } from "@/src/lib/auth/actor";
import { getChallengeReplays } from "@/src/lib/game/challenge-service";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const attemptId =
      new URL(request.url).searchParams.get("attempt") ?? undefined;
    const result = await getChallengeReplays(
      code,
      await getOptionalActorId(),
      attemptId,
    );
    if (result === null) {
      return NextResponse.json(
        { error: "Results not found." },
        { status: 404, headers },
      );
    }
    return NextResponse.json(result, { headers });
  } catch {
    return NextResponse.json(
      { error: "Could not load results." },
      { status: 500, headers },
    );
  }
}
