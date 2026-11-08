import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createChallengeSchema } from "@/src/lib/api-schemas";
import { createFriendChallenge } from "@/src/lib/game/challenge-service";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to create a challenge." },
        { status: 401 },
      );
    }
    const input = createChallengeSchema.parse(await request.json());
    return NextResponse.json(await createFriendChallenge(input, userId), {
      status: 201,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create challenge.",
      },
      { status: 400 },
    );
  }
}
