import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { startRoundSchema } from "@/src/lib/api-schemas";
import { startRound } from "@/src/lib/game/round-service";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const input = startRoundSchema.parse(body);
    const round = await startRound(input, userId);
    return NextResponse.json(round);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to start round.",
      },
      { status: 400 },
    );
  }
}
