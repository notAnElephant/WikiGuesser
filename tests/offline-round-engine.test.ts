import { describe, expect, it } from "vitest";

import { demoSnapshot } from "@/src/lib/content/demo-snapshot";
import { buildOfflineCountryPack } from "@/src/lib/offline/country-pack";
import {
  giveUpOfflineRound,
  resumeOfflineRound,
  revealOfflineClue,
  startOfflineRound,
  submitOfflineGuess,
} from "@/src/lib/offline/round-engine";
import {
  applyOfflineResultToStats,
  createEmptyOfflineModeStats,
} from "@/src/lib/offline/storage";

const pack = buildOfflineCountryPack(demoSnapshot);

describe("offline round engine", () => {
  it("starts classic deterministically and resumes all client-visible state", () => {
    const first = startOfflineRound(pack, { mode: "classic", seed: "fixed" });
    const second = startOfflineRound(pack, { mode: "classic", seed: "fixed" });

    expect(first.state.entityId).toBe(second.state.entityId);
    expect(first.playOrigin).toBe("offline");
    expect(first.revealedClues).toHaveLength(1);
    expect(first.canGuess).toBe(true);
    expect(resumeOfflineRound(pack, first.state)).toMatchObject({
      roundId: first.roundId,
      clues: first.clues,
      guesses: [],
    });
  });

  it("filters continents and removes the redundant clue", () => {
    const round = startOfflineRound(pack, {
      mode: "classic",
      continent: "europe",
      seed: "fixed",
    });

    expect(round.state.entityId).toBe("countries-france");
    expect(round.clues.some((clue) => clue.key === "continent")).toBe(false);
    expect(round.revealedClues[0]?.key).toBe("area");
  });

  it("reveals classic clues after misses and keeps the final wrong guess", () => {
    let round = startOfflineRound(pack, { mode: "classic", seed: "fixed" });
    const entity = pack.entities.find(
      (candidate) => candidate.id === round.state.entityId,
    )!;
    const wrong = entity.canonicalAnswer === "France" ? "Japan" : "France";
    let result = submitOfflineGuess(pack, round.state, wrong);

    expect(result.guesses).toHaveLength(1);
    expect(result.guesses[0]).toMatchObject({ name: wrong });
    while (!result.isComplete && result.remainingClues > 0) {
      result = submitOfflineGuess(pack, result.state!, wrong);
    }
    expect(result.isComplete).toBe(false);
    result = submitOfflineGuess(pack, result.state!, wrong);

    expect(result.isComplete).toBe(true);
    expect(result.state).toBeNull();
    expect(result.canonicalAnswer).toBe(entity.canonicalAnswer);
    expect(result.guesses).toHaveLength(entity.clues.length);
  });

  it("enforces blurred-lines reveal locks and alternates reveals with guesses", () => {
    const round = startOfflineRound(pack, {
      mode: "blurred-lines",
      seed: "fixed",
    });
    expect(round.canGuess).toBe(false);
    expect(() => revealOfflineClue(pack, round.state, "capital")).toThrow(
      /Reveal 5 more clues/,
    );

    const revealed = revealOfflineClue(pack, round.state, "continent");
    const missed = submitOfflineGuess(pack, revealed.state, "not a country");
    expect(missed.isComplete).toBe(false);
    expect(missed.canGuess).toBe(false);
    expect(missed.guesses).toEqual([
      { name: "not a country", direction: null, mapData: null },
    ]);
    expect(() => submitOfflineGuess(pack, missed.state!, "France")).toThrow(
      "Reveal a clue before guessing.",
    );
  });

  it("halves a correct map-guess score and reveals the solution", () => {
    const round = startOfflineRound(pack, { mode: "classic", seed: "fixed" });
    const entity = pack.entities.find(
      (candidate) => candidate.id === round.state.entityId,
    )!;
    const result = submitOfflineGuess(
      pack,
      round.state,
      entity.canonicalAnswer,
      "map",
    );

    expect(result).toMatchObject({
      isCorrect: true,
      isComplete: true,
      score: 50,
    });
    expect(result.solutionCountry?.qid).toBe(entity.qid);
  });

  it("gives up without scoring", () => {
    const round = startOfflineRound(pack, { seed: "fixed" });
    expect(giveUpOfflineRound(pack, round.state)).toMatchObject({
      isCorrect: false,
      isComplete: true,
      score: 0,
      state: null,
    });
  });
});

describe("offline aggregate stats", () => {
  it("tracks wins, score records, and resets only the current streak", () => {
    const empty = createEmptyOfflineModeStats(
      "classic",
      "2026-01-01T00:00:00.000Z",
    );
    const first = applyOfflineResultToStats(
      empty,
      { isCorrect: true, score: 80 },
      "2026-01-02T00:00:00.000Z",
    );
    const second = applyOfflineResultToStats(
      first,
      { isCorrect: true, score: 100 },
      "2026-01-03T00:00:00.000Z",
    );
    const loss = applyOfflineResultToStats(
      second,
      { isCorrect: false, score: 0 },
      "2026-01-04T00:00:00.000Z",
    );

    expect(loss).toMatchObject({
      roundsPlayed: 3,
      roundsWon: 2,
      totalScore: 180,
      bestScore: 100,
      currentStreak: 0,
      bestStreak: 2,
    });
  });
});
