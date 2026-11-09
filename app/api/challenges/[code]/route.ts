import { NextResponse } from "next/server";

import { challengeActionSchema } from "@/src/lib/api-schemas";
import { getActorId, getOptionalActorId } from "@/src/lib/auth/actor";
import {
  getFriendChallenge,
  playFriendChallenge,
} from "@/src/lib/game/challenge-service";

type Context = { params: Promise<{ code: string }> };
const headers = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { code } = await params;
    return NextResponse.json(
      await getFriendChallenge(code, await getOptionalActorId()),
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load challenge.",
      },
      { status: 400, headers },
    );
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { code } = await params;
    const input = challengeActionSchema.parse(await request.json());
    return NextResponse.json(
      await playFriendChallenge(code, await getActorId(), input),
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update challenge.",
      },
      { status: 400, headers },
    );
  }
}
