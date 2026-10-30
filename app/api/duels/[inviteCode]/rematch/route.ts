import { NextResponse } from "next/server";

import { getActorId } from "@/src/lib/auth/actor";
import { createDuelRematch } from "@/src/lib/game/duel-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ inviteCode: string }> },
) {
  try {
    const [{ inviteCode }, actorId] = await Promise.all([
      context.params,
      getActorId(),
    ]);
    return NextResponse.json(
      await createDuelRematch(inviteCode, actorId, new URL(request.url).origin),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create rematch.",
      },
      { status: 400 },
    );
  }
}
