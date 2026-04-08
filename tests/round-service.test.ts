import { describe, expect, it } from "vitest";

import { parseRoundState } from "@/src/lib/game/round-token";
import { revealClue, startRound, submitGuess } from "@/src/lib/game/round-service";
import { getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";

describe("round service", () => {
  it("starts deterministically for a fixed category and seed", async () => {
    const firstRound = await startRound({ category: "countries", seed: "alpha" }, "user_test_alpha");
    const secondRound = await startRound({ category: "countries", seed: "alpha" }, "user_test_alpha");

    expect(parseRoundState(firstRound.token).entityId).toBe(parseRoundState(secondRound.token).entityId);
    expect(parseRoundState(firstRound.token).userId).toBe("user_test_alpha");
    expect(firstRound.mode).toBe("classic");
    expect(firstRound.revealedClues).toHaveLength(1);
    expect(firstRound.canGuess).toBe(true);
  });

  it("reveals the next clue after an incorrect classic guess", async () => {
    const round = await startRound({ category: "countries", seed: "alpha" }, "user_test_alpha");
    const roundState = parseRoundState(round.token);
    const snapshot = await getLatestSnapshot();
    const actualEntity = snapshot.entities.find((entity) => entity.id === roundState.entityId);
    const wrongCountry = actualEntity?.canonicalAnswer === "France" ? "Japan" : "France";
    const result = await submitGuess(
      {
        token: round.token,
        guess: wrongCountry,
      },
      "user_test_alpha",
    );

    expect(result.mode).toBe("classic");
    expect(result.isCorrect).toBe(false);
    expect(result.isComplete).toBe(false);
    expect(result.revealedClues).toHaveLength(2);
    expect(result.canGuess).toBe(true);
  });

  it("allows one final guess after the last classic clue is revealed", async () => {
    const round = await startRound({ category: "countries", seed: "alpha" }, "user_test_alpha");
    const roundState = parseRoundState(round.token);
    const snapshot = await getLatestSnapshot();
    const actualEntity = snapshot.entities.find((entity) => entity.id === roundState.entityId);
    const wrongCountry = actualEntity?.canonicalAnswer === "France" ? "Japan" : "France";

    let activeToken = round.token;
    let latestResult = await submitGuess(
      {
        token: activeToken,
        guess: wrongCountry,
      },
      "user_test_alpha",
    );

    while (!latestResult.isComplete && latestResult.remainingClues > 0) {
      activeToken = latestResult.token!;
      latestResult = await submitGuess(
        {
          token: activeToken,
          guess: wrongCountry,
        },
        "user_test_alpha",
      );
    }

    expect(latestResult.isComplete).toBe(false);
    expect(latestResult.remainingClues).toBe(0);
    expect(latestResult.token).not.toBeNull();
    expect(latestResult.revealedClues).toHaveLength(actualEntity!.clues.length);

    const finalGuessResult = await submitGuess(
      {
        token: latestResult.token!,
        guess: wrongCountry,
      },
      "user_test_alpha",
    );

    expect(finalGuessResult.isComplete).toBe(true);
    expect(finalGuessResult.token).toBeNull();
    expect(finalGuessResult.canonicalAnswer).toBe(actualEntity!.canonicalAnswer);
  });

  it("starts blurred lines with a fully hidden table", async () => {
    const round = await startRound({ category: "countries", mode: "blurred-lines", seed: "alpha" }, "user_test_alpha");
    const roundState = parseRoundState(round.token);
    const snapshot = await getLatestSnapshot();
    const actualEntity = snapshot.entities.find((entity) => entity.id === roundState.entityId);

    expect(round.mode).toBe("blurred-lines");
    expect(round.revealedClues).toHaveLength(0);
    expect(round.canGuess).toBe(false);
    expect(round.clues).toHaveLength(actualEntity!.clues.length);
    expect(round.clues.every((clue) => clue.value === null)).toBe(true);
    expect(round.clues.every((clue) => clue.prefetchedValue.length > 0)).toBe(true);
  });

  it("reveals a chosen blurred-lines clue and unlocks a guess", async () => {
    const round = await startRound({ category: "countries", mode: "blurred-lines", seed: "alpha" }, "user_test_alpha");
    const roundState = parseRoundState(round.token);
    const snapshot = await getLatestSnapshot();
    const actualEntity = snapshot.entities.find((entity) => entity.id === roundState.entityId);
    const chosenClue = actualEntity!.clues.find((clue) => clue.spoilerLevel === "safe") ?? actualEntity!.clues[0]!;
    const result = await revealClue(
      {
        token: round.token,
        clueKey: chosenClue.key,
      },
      "user_test_alpha",
    );

    expect(result.mode).toBe("blurred-lines");
    expect(result.canGuess).toBe(true);
    expect(result.revealedClues).toHaveLength(1);
    expect(result.clues.find((clue) => clue.key === chosenClue.key)?.value).toBe(chosenClue.value);
  });

  it("requires a reveal before the first blurred-lines guess", async () => {
    const round = await startRound({ category: "countries", mode: "blurred-lines", seed: "alpha" }, "user_test_alpha");

    await expect(
      submitGuess(
        {
          token: round.token,
          guess: "France",
        },
        "user_test_alpha",
      ),
    ).rejects.toThrow("Reveal a clue before guessing.");
  });

  it("does not auto-reveal a new blurred-lines clue after a wrong guess", async () => {
    const round = await startRound({ category: "countries", mode: "blurred-lines", seed: "alpha" }, "user_test_alpha");
    const roundState = parseRoundState(round.token);
    const snapshot = await getLatestSnapshot();
    const actualEntity = snapshot.entities.find((entity) => entity.id === roundState.entityId);
    const chosenClue = actualEntity!.clues[1]!;
    const revealedRound = await revealClue(
      {
        token: round.token,
        clueKey: chosenClue.key,
      },
      "user_test_alpha",
    );
    const wrongCountry = actualEntity?.canonicalAnswer === "France" ? "Japan" : "France";
    const guessResult = await submitGuess(
      {
        token: revealedRound.token,
        guess: wrongCountry,
      },
      "user_test_alpha",
    );

    expect(guessResult.isCorrect).toBe(false);
    expect(guessResult.isComplete).toBe(false);
    expect(guessResult.revealedClues).toHaveLength(1);
    expect(guessResult.remainingClues).toBe(actualEntity!.clues.length - 1);
    expect(guessResult.canGuess).toBe(false);
  });

  it("awards score for a correct guess", async () => {
    const round = await startRound({ category: "countries", seed: "alpha" }, "user_test_alpha");
    const roundState = parseRoundState(round.token);
    const snapshot = await getLatestSnapshot();
    const actualEntity = snapshot.entities.find((entity) => entity.id === roundState.entityId);
    expect(actualEntity).toBeTruthy();
    const correctAnswer = actualEntity!.canonicalAnswer;

    const result = await submitGuess(
      {
        token: round.token,
        guess: correctAnswer,
      },
      "user_test_alpha",
    );

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
