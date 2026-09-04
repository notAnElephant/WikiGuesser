import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createDuelRematch } from "@/src/lib/game/duel-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ inviteCode: string }> },
) {
  try {
    const { isAuthenticated, userId } = await auth();
    if (!isAuthenticated || !userId) {
      return NextResponse.json(
        { error: "Sign in to request a rematch." },
        { status: 401 },
      );
    }
    const { inviteCode } = await context.params;
    return NextResponse.json(
      await createDuelRematch(inviteCode, userId, new URL(request.url).origin),
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
