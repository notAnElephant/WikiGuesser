import { describe, expect, it } from "vitest";

import { parseRoundState } from "@/src/lib/game/round-token";
import { startRound, submitGuess } from "@/src/lib/game/round-service";
import { getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";

describe("round service", () => {
  it("starts deterministically for a fixed category and seed", async () => {
    const firstRound = await startRound({ category: "countries", seed: "alpha" }, "user_test_alpha");
    const secondRound = await startRound({ category: "countries", seed: "alpha" }, "user_test_alpha");

    expect(parseRoundState(firstRound.token).entityId).toBe(parseRoundState(secondRound.token).entityId);
    expect(parseRoundState(firstRound.token).userId).toBe("user_test_alpha");
    expect(firstRound.revealedClues).toHaveLength(1);
  });

  it("reveals the next clue after an incorrect guess", async () => {
    const round = await startRound({ category: "countries", seed: "alpha" }, "user_test_alpha");
    const roundState = parseRoundState(round.token);
    const snapshot = await getLatestSnapshot();
    const actualEntity = snapshot.entities.find((entity) => entity.id === roundState.entityId);
    const wrongCountry = actualEntity?.canonicalAnswer === "France" ? "Japan" : "France";
    const result = await submitGuess({
      token: round.token,
      guess: wrongCountry,
    }, "user_test_alpha");

    expect(result.isCorrect).toBe(false);
    expect(result.isComplete).toBe(false);
    expect(result.revealedClues).toHaveLength(2);
  });

  it("awards score for a correct guess", async () => {
    const round = await startRound({ category: "countries", seed: "alpha" }, "user_test_alpha");
    const roundState = parseRoundState(round.token);
    const snapshot = await getLatestSnapshot();
    const actualEntity = snapshot.entities.find((entity) => entity.id === roundState.entityId);
    expect(actualEntity).toBeTruthy();
    const correctAnswer = actualEntity!.canonicalAnswer;

    const result = await submitGuess({
      token: round.token,
      guess: correctAnswer,
    }, "user_test_alpha");

    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(100);
    expect(result.canonicalAnswer).toBe(correctAnswer);
  });

  it("rejects guesses for a different authenticated user", async () => {
    const round = await startRound({ category: "countries", seed: "alpha" }, "user_owner");

    await expect(
      submitGuess(
        {
          token: round.token,
          guess: "France",
        },
        "user_intruder",
      ),
    ).rejects.toThrow("Round token does not belong to the authenticated user.");
  });
});
