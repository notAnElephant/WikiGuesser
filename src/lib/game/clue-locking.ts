import type { RoundClue } from "@/src/lib/types";

export const FLAG_UNLOCK_AFTER_REVEALS = 3;

type ClueUnlockState = Pick<RoundClue, "key" | "spoilerLevel" | "isRevealed">;

export function getClueUnlockRoundsRemaining(
  clues: ClueUnlockState[],
  clue: ClueUnlockState,
): number {
  if (clue.isRevealed) {
    return 0;
  }

  if (clue.key === "flag-colors") {
    const revealedCount = clues.filter((entry) => entry.isRevealed).length;

    return Math.max(FLAG_UNLOCK_AFTER_REVEALS - revealedCount, 0);
  }

  if (clue.spoilerLevel === "late") {
    return clues.filter(
      (entry) => entry.spoilerLevel === "safe" && !entry.isRevealed,
    ).length;
  }

  return 0;
}

export function isClueLocked(
  clues: ClueUnlockState[],
  clue: ClueUnlockState,
): boolean {
  return getClueUnlockRoundsRemaining(clues, clue) > 0;
}
