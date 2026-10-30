import { NextResponse } from "next/server";

import { duelRevealSchema } from "@/src/lib/api-schemas";
import { getActorId } from "@/src/lib/auth/actor";
import { revealDuelClue } from "@/src/lib/game/duel-service";

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
    const input = duelRevealSchema.parse(await request.json());
    return NextResponse.json({
      duel: await revealDuelClue(
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
          error instanceof Error ? error.message : "Unable to reveal clue.",
      },
      { status: 400 },
    );
  }
}
