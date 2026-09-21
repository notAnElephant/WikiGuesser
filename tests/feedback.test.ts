import { describe, expect, it } from "vitest";

import { createFeedbackSchema } from "@/src/lib/api-schemas";
import { createFeedbackNotification } from "@/src/lib/feedback-notification";

describe("feedback schema", () => {
  it("accepts contextual clue feedback", () => {
    expect(
      createFeedbackSchema.parse({
        kind: "content_issue",
        message: "This clue does not match the answer.",
        context: {
          source: "clue",
          category: "countries",
          gameType: "free_play",
          mode: "classic",
          clueKey: "capital",
          clueLabel: "Capital",
        },
      }),
    ).toMatchObject({
      kind: "content_issue",
      context: { clueKey: "capital", source: "clue" },
    });
  });

  it("rejects unexpected context fields and overly long comments", () => {
    expect(() =>
      createFeedbackSchema.parse({
        kind: "other",
        message: "a".repeat(2_001),
        context: { source: "global", guessedAnswer: "France" },
      }),
    ).toThrow();
  });

  it("formats submitted feedback for an email notification", () => {
    expect(
      createFeedbackNotification({
        context: { category: "countries", source: "clue" },
        id: "feedback_123",
        kind: "CONTENT_ISSUE",
        message: "The capital is incorrect.",
        path: "/play/classic",
      }),
    ).toEqual({
      subject: "[WikiGuesser] New content issue feedback",
      text: expect.stringContaining("The capital is incorrect."),
    });
  });
});
