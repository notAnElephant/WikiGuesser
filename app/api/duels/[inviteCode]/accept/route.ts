import { NextResponse } from "next/server";

import { getActorId } from "@/src/lib/auth/actor";
import { acceptDuel } from "@/src/lib/game/duel-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ inviteCode: string }> },
) {
  try {
    const [{ inviteCode }, actorId] = await Promise.all([
      context.params,
      getActorId(),
    ]);
    return NextResponse.json({
      duel: await acceptDuel(inviteCode, actorId, new URL(request.url).origin),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to accept duel.",
      },
      { status: 400 },
    );
  }
}
