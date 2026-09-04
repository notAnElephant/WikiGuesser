import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { startDuelRound } from "@/src/lib/game/duel-service";

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
    if (!Number.isInteger(position) || position < 1)
      throw new Error("Invalid duel round.");
    return NextResponse.json({
      duel: await startDuelRound(
        inviteCode,
        position,
        userId,
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
