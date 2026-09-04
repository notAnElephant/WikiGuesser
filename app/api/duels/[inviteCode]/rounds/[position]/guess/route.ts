import { NextResponse } from "next/server";

import { duelGuessSchema } from "@/src/lib/api-schemas";
import { getActorId } from "@/src/lib/auth/actor";
import { guessDuelRound } from "@/src/lib/game/duel-service";

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
    const input = duelGuessSchema.parse(await request.json());
    return NextResponse.json({
      duel: await guessDuelRound(
        inviteCode,
        position,
        input,
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
            : "Unable to submit duel guess.",
      },
      { status: 400 },
    );
  }
}
