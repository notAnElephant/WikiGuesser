import { NextResponse } from "next/server";

import { createFeedbackSchema } from "@/src/lib/api-schemas";
import { getOptionalActorId } from "@/src/lib/auth/actor";
import { sendFeedbackNotification } from "@/src/lib/feedback-notification";
import { getPrismaClient } from "@/src/lib/repository/prisma";

const feedbackKindMap = {
  positive: "POSITIVE",
  bug: "BUG",
  content_issue: "CONTENT_ISSUE",
  confusing: "CONFUSING",
  feature_idea: "FEATURE_IDEA",
  other: "OTHER",
} as const;

export async function POST(request: Request) {
  try {
    const input = createFeedbackSchema.parse(await request.json());
    const actorId = await getOptionalActorId();
    const referer = request.headers.get("referer");
    let path: string | null = null;

    if (referer) {
      try {
        path = new URL(referer).pathname;
      } catch {
        // Feedback storage should not fail because a client sent an invalid referrer.
      }
    }

    const feedback = await getPrismaClient().feedback.create({
      data: {
        actorId,
        context: input.context,
        kind: feedbackKindMap[input.kind],
        message: input.message || null,
        path,
      },
    });

    try {
      await sendFeedbackNotification(feedback);
    } catch (error) {
      // Retain the feedback even when the optional delivery channel is unavailable.
      console.error("[feedback] failed to send notification", error);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save feedback.",
      },
      { status: 400 },
    );
  }
}
