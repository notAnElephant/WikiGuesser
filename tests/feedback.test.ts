import { describe, expect, it } from "vitest";

import { createFeedbackSchema } from "@/src/lib/api-schemas";

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
});
