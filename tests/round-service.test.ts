import { describe, expect, it } from "vitest";

import { parseRoundState } from "@/src/lib/game/round-token";
import { startRound, submitGuess } from "@/src/lib/game/round-service";

describe("round service", () => {
  it("starts deterministically for a fixed category and seed", async () => {
    const firstRound = await startRound({ category: "countries", seed: "alpha" });
    const secondRound = await startRound({ category: "countries", seed: "alpha" });

    expect(parseRoundState(firstRound.token).entityId).toBe(parseRoundState(secondRound.token).entityId);
    expect(firstRound.revealedClues).toHaveLength(1);
  });

  it("reveals the next clue after an incorrect guess", async () => {
    const round = await startRound({ category: "countries", seed: "alpha" });
    const result = await submitGuess({
      token: round.token,
      guess: "wrong answer",
    });

    expect(result.isCorrect).toBe(false);
    expect(result.isComplete).toBe(false);
    expect(result.revealedClues).toHaveLength(2);
  });

  it("awards score for a correct guess", async () => {
    const round = await startRound({ category: "countries", seed: "alpha" });
    const roundState = parseRoundState(round.token);
    const correctAnswer = roundState.entityId.includes("france") ? "France" : "Japan";

    const result = await submitGuess({
      token: round.token,
      guess: correctAnswer,
    });

    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(100);
    expect(result.canonicalAnswer).toBe(correctAnswer);
  });
});
