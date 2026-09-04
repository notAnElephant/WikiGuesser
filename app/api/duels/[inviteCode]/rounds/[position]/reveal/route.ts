import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { duelRevealSchema } from "@/src/lib/api-schemas";
import { revealDuelClue } from "@/src/lib/game/duel-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ inviteCode: string; position: string }> },
) {
  try {
    const { isAuthenticated, userId } = await auth();
    if (!isAuthenticated || !userId)
      return NextResponse.json({ error: "Sign in to play." }, { status: 401 });
    const { inviteCode, position: rawPosition } = await context.params;
    const position = Number.parseInt(rawPosition, 10);
    const input = duelRevealSchema.parse(await request.json());
    return NextResponse.json({
      duel: await revealDuelClue(
        inviteCode,
        position,
        input,
        userId,
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
