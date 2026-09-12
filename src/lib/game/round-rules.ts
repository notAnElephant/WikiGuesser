import { getClueUnlockRoundsRemaining } from "@/src/lib/game/clue-locking";
import { getCurrencyRedactionTexts } from "@/src/lib/game/currency-censor";
import type {
  ContinentId,
  EntityCategory,
  GameMode,
  GuessRoundInput,
  NormalizedEntity,
  PlayableClue,
  RoundClue,
  RoundKind,
} from "@/src/lib/types";

const SCORE_BY_REVEAL_INDEX = [100, 80, 60, 40, 20, 10] as const;

export interface RoundRuleState {
  kind: RoundKind;
  mode: GameMode;
  continent?: ContinentId | null;
  revealedClueKeys: string[];
  canGuess: boolean;
}

export interface RoundRuleProgress {
  kind: RoundKind;
  category: EntityCategory;
  continent: ContinentId | null;
  mode: GameMode;
  clues: RoundClue[];
  revealedClues: PlayableClue[];
  remainingClues: number;
  canGuess: boolean;
}

export function getScoreForGuess(
  revealCount: number,
  method?: GuessRoundInput["method"],
): number {
  const normalizedRevealCount = Math.max(revealCount, 1);
  const score =
    SCORE_BY_REVEAL_INDEX[
      Math.min(normalizedRevealCount - 1, SCORE_BY_REVEAL_INDEX.length - 1)
    ] ?? 10;
  return method === "map" ? Math.floor(score / 2) : score;
}

export function getEffectiveRoundClues(
  entity: NormalizedEntity,
  mode: GameMode,
  continent?: ContinentId | null,
): PlayableClue[] {
  return entity.clues.filter(
    (clue) =>
      (!clue.mode || clue.mode === mode) &&
      (!continent || clue.key !== "continent"),
  );
}

export function getRoundClues(
  entity: NormalizedEntity,
  state: RoundRuleState,
  options?: { revealAll?: boolean },
): RoundClue[] {
  const revealedClueSet = new Set(state.revealedClueKeys);
  return getEffectiveRoundClues(entity, state.mode, state.continent).map(
    (clue) => {
      const isRevealed =
        options?.revealAll || revealedClueSet.has(clue.key);
      return {
        key: clue.key,
        label: clue.label,
        value: isRevealed ? clue.value : null,
        prefetchedValue: clue.value,
        isRevealed,
        difficulty: clue.difficulty,
        spoilerLevel: clue.spoilerLevel,
        ...(clue.key === "currency"
          ? {
              currencyRedactionTexts: getCurrencyRedactionTexts(
                clue.value,
                entity.canonicalAnswer,
              ),
            }
          : {}),
      };
    },
  );
}

export function buildRoundProgress(
  entity: NormalizedEntity,
  state: RoundRuleState,
  options?: { revealAll?: boolean },
): RoundRuleProgress {
  const effectiveClues = getEffectiveRoundClues(
    entity,
    state.mode,
    state.continent,
  );
  const revealedClueSet = new Set(state.revealedClueKeys);
  return {
    kind: state.kind,
    category: entity.category,
    continent: state.continent ?? null,
    mode: state.mode,
    clues: getRoundClues(entity, state, options),
    revealedClues: effectiveClues.filter((clue) =>
      revealedClueSet.has(clue.key),
    ),
    remainingClues: Math.max(
      effectiveClues.length - state.revealedClueKeys.length,
      0,
    ),
    canGuess: state.canGuess,
  };
}

export function getNextClassicClueKey(
  entity: NormalizedEntity,
  state: RoundRuleState,
): string | null {
  const revealedClueSet = new Set(state.revealedClueKeys);
  return (
    getEffectiveRoundClues(entity, state.mode, state.continent).find(
      (clue) => !revealedClueSet.has(clue.key),
    )?.key ?? null
  );
}

export function validateManualClueReveal(
  entity: NormalizedEntity,
  state: RoundRuleState,
  clueKey: string,
): PlayableClue {
  if (state.mode !== "blurred-lines") {
    throw new Error(
      "Manual clue reveals are only available in blurred lines mode.",
    );
  }
  const effectiveClues = getEffectiveRoundClues(
    entity,
    state.mode,
    state.continent,
  );
  const selectedClue = effectiveClues.find((clue) => clue.key === clueKey);
  if (!selectedClue) {
    throw new Error("That clue does not exist for this round.");
  }
  if (state.revealedClueKeys.includes(selectedClue.key)) {
    throw new Error("That clue is already revealed.");
  }
  const revealedClueSet = new Set(state.revealedClueKeys);
  const clueUnlockState = effectiveClues.map((clue) => ({
    key: clue.key,
    spoilerLevel: clue.spoilerLevel,
    isRevealed: revealedClueSet.has(clue.key),
  }));
  const selectedClueUnlockState = clueUnlockState.find(
    (clue) => clue.key === selectedClue.key,
  )!;
  const unlockRoundsRemaining = getClueUnlockRoundsRemaining(
    clueUnlockState,
    selectedClueUnlockState,
  );
  if (unlockRoundsRemaining > 0) {
    throw new Error(
      `That field unlocks in ${unlockRoundsRemaining} ${unlockRoundsRemaining === 1 ? "round" : "rounds"}.`,
    );
  }
  return selectedClue;
}
