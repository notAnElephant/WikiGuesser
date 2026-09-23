import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { startAdminTestRoundSchema } from "@/src/lib/api-schemas";
import { isAdminUser } from "@/src/lib/auth/admin";
import { getActorId } from "@/src/lib/auth/actor";
import { startAdminTestRound } from "@/src/lib/game/round-service";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminUser(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = startAdminTestRoundSchema.parse(await request.json());
    const round = await startAdminTestRound(input, await getActorId());
    return NextResponse.json(round);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to start test round.",
      },
      { status: 400 },
    );
  }
}
