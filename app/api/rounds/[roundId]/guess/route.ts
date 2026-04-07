import { NextResponse } from "next/server";

import { submitGuessSchema } from "@/src/lib/api-schemas";
import { parseRoundState } from "@/src/lib/game/round-token";
import { submitGuess } from "@/src/lib/game/round-service";

export async function POST(request: Request, context: { params: Promise<{ roundId: string }> }) {
  try {
    const body = await request.json();
    const input = submitGuessSchema.parse(body);
    const { roundId } = await context.params;
    const roundState = parseRoundState(input.token);

    if (roundState.roundId !== roundId) {
      throw new Error("Round token does not match the requested round.");
    }

    const result = await submitGuess(input);
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
