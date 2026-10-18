import { NextResponse } from "next/server";

import { createThemeRatingSchema } from "@/src/lib/api-schemas";
import { getOptionalActorId } from "@/src/lib/auth/actor";
import { getPrismaClient } from "@/src/lib/repository/prisma";

const deviceMap = {
  desktop: "DESKTOP",
  mobile: "MOBILE",
} as const;

export async function POST(request: Request) {
  try {
    const input = createThemeRatingSchema.parse(await request.json());

    await getPrismaClient().themeRating.create({
      data: {
        actorId: await getOptionalActorId(),
        device: deviceMap[input.device],
        score: input.score,
        theme: input.theme,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save rating.",
      },
      { status: 400 },
    );
  }
}
