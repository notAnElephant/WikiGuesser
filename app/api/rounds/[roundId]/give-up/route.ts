import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getActorId } from "@/src/lib/auth/actor";
import { giveUpRoundSchema } from "@/src/lib/api-schemas";
import {
  PENDING_DAILY_CLAIMS_COOKIE,
  getPendingDailyClaimCookieOptions,
  parsePendingDailyClaimIds,
  serializePendingDailyClaimIds,
} from "@/src/lib/game/daily-claim-cookie";
import { parseRoundState } from "@/src/lib/game/round-token";
import { giveUpRound } from "@/src/lib/game/round-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ roundId: string }> },
) {
  try {
    const actorId = await getActorId();
    const body = await request.json();
    const input = giveUpRoundSchema.parse(body);
    const { roundId } = await context.params;
    const roundState = parseRoundState(input.token);

    if (roundState.roundId !== roundId) {
      throw new Error("Round token does not match the requested round.");
    }

    if (roundState.userId !== actorId) {
      return NextResponse.json(
        { error: "Round token does not belong to this player." },
        { status: 403 },
      );
    }

    const result = await giveUpRound(input, actorId);
    const response = NextResponse.json(result);

    if (result.pendingClaimId && actorId.startsWith("guest:")) {
      const cookieStore = await cookies();
      const existingIds = parsePendingDailyClaimIds(
        cookieStore.get(PENDING_DAILY_CLAIMS_COOKIE)?.value,
      );
      const nextIds = [...new Set([...existingIds, result.pendingClaimId])];

      response.cookies.set(
        PENDING_DAILY_CLAIMS_COOKIE,
        serializePendingDailyClaimIds(nextIds),
        getPendingDailyClaimCookieOptions(),
      );
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to give up.",
      },
      { status: 400 },
    );
  }
}
