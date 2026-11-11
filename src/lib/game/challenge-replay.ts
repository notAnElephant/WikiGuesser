import type { ChallengeReplay } from "@/src/lib/types";

export function getChallengeReplaySteps(replay: ChallengeReplay) {
  const steps: {
    kind: "clue" | "guess" | "finish";
    clueCount: number;
    guessCount: number;
  }[] = [];
  const totalClues = replay.revealedClueKeys.length;
  let clueCount = 0;
  let guessCount = 0;
  let approximate = false;

  function revealThrough(count: number) {
    while (clueCount < Math.min(count, totalClues)) {
      steps.push({ kind: "clue", clueCount: ++clueCount, guessCount });
    }
  }

  for (const guess of replay.guesses) {
    const lastGuess = guessCount + 1 === replay.guesses.length;
    // Old Classic attempts reveal one clue before every guess. Older Choose
    // Clues attempts only saved the reveal order, so extra reveals can be ambiguous.
    const fallbackCount =
      lastGuess && replay.outcome === "SOLVED" ? totalClues : guessCount + 1;
    if (
      replay.mode === "blurred-lines" &&
      guess.revealedClueCount === undefined &&
      totalClues > replay.guesses.length
    ) {
      approximate = true;
    }
    revealThrough(guess.revealedClueCount ?? fallbackCount);
    steps.push({ kind: "guess", clueCount, guessCount: ++guessCount });
  }
  revealThrough(totalClues);
  steps.push({ kind: "finish", clueCount, guessCount });
  return { steps, approximate };
}
