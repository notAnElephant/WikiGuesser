import { NextResponse } from "next/server";

import { getActorId } from "@/src/lib/auth/actor";
import { startDailyRoundSchema } from "@/src/lib/api-schemas";
import { startDailyRound } from "@/src/lib/game/round-service";

export async function POST(request: Request) {
  try {
    const actorId = await getActorId();
    const body = await request.json();
    const input = startDailyRoundSchema.parse(body);
    const round = await startDailyRound(input, actorId);
    return NextResponse.json(round);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start daily challenge.",
      },
      { status: 400 },
    );
  }
}
