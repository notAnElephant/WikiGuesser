import { NextResponse } from "next/server";

import { duelMutationSchema } from "@/src/lib/api-schemas";
import { getActorId } from "@/src/lib/auth/actor";
import { giveUpDuelRound } from "@/src/lib/game/duel-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ inviteCode: string; position: string }> },
) {
  try {
    const [{ inviteCode, position: rawPosition }, actorId] = await Promise.all([
      context.params,
      getActorId(),
    ]);
    const position = Number.parseInt(rawPosition, 10);
    const { version } = duelMutationSchema.parse(await request.json());
    return NextResponse.json({
      duel: await giveUpDuelRound(
        inviteCode,
        position,
        version,
        actorId,
        new URL(request.url).origin,
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to give up duel round.",
      },
      { status: 400 },
    );
  }
}
