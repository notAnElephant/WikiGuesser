import { NextResponse } from "next/server";

import { getActorId } from "@/src/lib/auth/actor";
import { getDuel } from "@/src/lib/game/duel-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ inviteCode: string }> },
) {
  try {
    const [{ inviteCode }, actorId] = await Promise.all([
      context.params,
      getActorId(),
    ]);
    return NextResponse.json({
      duel: await getDuel(inviteCode, actorId, new URL(request.url).origin),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load duel.",
      },
      { status: 400 },
    );
  }
}
