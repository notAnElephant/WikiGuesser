import { NextResponse } from "next/server";

import { getActorId } from "@/src/lib/auth/actor";
import { startDuelRound } from "@/src/lib/game/duel-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ inviteCode: string; position: string }> },
) {
  try {
    const [{ inviteCode, position: rawPosition }, actorId] = await Promise.all([
      context.params,
      getActorId(),
    ]);
    const position = Number.parseInt(rawPosition, 10);
    if (!Number.isInteger(position) || position < 1)
      throw new Error("Invalid duel round.");
    return NextResponse.json({
      duel: await startDuelRound(
        inviteCode,
        position,
        actorId,
        new URL(request.url).origin,
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start duel round.",
      },
      { status: 400 },
    );
  }
}
