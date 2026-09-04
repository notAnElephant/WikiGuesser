import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createDuelSchema } from "@/src/lib/api-schemas";
import { createDuel } from "@/src/lib/game/duel-service";

export async function POST(request: Request) {
  try {
    const { isAuthenticated, userId } = await auth();
    if (!isAuthenticated || !userId) {
      return NextResponse.json(
        { error: "Sign in to create a duel." },
        { status: 401 },
      );
    }
    const input = createDuelSchema.parse(await request.json());
    return NextResponse.json(
      await createDuel(input, userId, new URL(request.url).origin),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create duel.",
      },
      { status: 400 },
    );
  }
}
