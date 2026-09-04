import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { acceptDuel } from "@/src/lib/game/duel-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ inviteCode: string }> },
) {
  try {
    const { isAuthenticated, userId } = await auth();
    if (!isAuthenticated || !userId) {
      return NextResponse.json(
        { error: "Sign in to accept this duel." },
        { status: 401 },
      );
    }
    const { inviteCode } = await context.params;
    return NextResponse.json({
      duel: await acceptDuel(inviteCode, userId, new URL(request.url).origin),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to accept duel.",
      },
      { status: 400 },
    );
  }
}
