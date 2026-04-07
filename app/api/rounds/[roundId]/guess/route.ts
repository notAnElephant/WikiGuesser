import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { submitGuessSchema } from "@/src/lib/api-schemas";
import { parseRoundState } from "@/src/lib/game/round-token";
import { submitGuess } from "@/src/lib/game/round-service";

export async function POST(request: Request, context: { params: Promise<{ roundId: string }> }) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const input = submitGuessSchema.parse(body);
    const { roundId } = await context.params;
    const roundState = parseRoundState(input.token);

    if (roundState.roundId !== roundId) {
      throw new Error("Round token does not match the requested round.");
    }

    if (roundState.userId !== userId) {
      return NextResponse.json({ error: "Round token does not belong to the authenticated user." }, { status: 403 });
    }

    const result = await submitGuess(input, userId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to submit guess.",
      },
      { status: 400 },
    );
  }
}
