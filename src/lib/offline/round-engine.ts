import { matchesEntityGuess } from "@/src/lib/game/answer-matching";
import { getClueUnlockRoundsRemaining } from "@/src/lib/game/clue-locking";
import { getCurrencyRedactionTexts } from "@/src/lib/game/currency-censor";
import {
  getGuessedCountryMapData,
  getSolutionCountryMapData,
} from "@/src/lib/game/guess-direction";
import type {
  GameMode,
  GuessRoundInput,
  NormalizedEntity,
  RoundClue,
  StartRoundInput,
} from "@/src/lib/types";
import {
  OFFLINE_SCHEMA_VERSION,
  offlineCountryPackSchema,
  offlineRoundStateSchema,
  type OfflineCountryPack,
  type OfflineCountryEntity,
  type OfflineGuessRoundResult,
  type OfflineRevealClueResult,
  type OfflineRoundProgress,
  type OfflineRoundState,
  type OfflineStartRoundResult,
} from "@/src/lib/offline/types";

const SCORE_BY_REVEAL_INDEX = [100, 80, 60, 40, 20, 10] as const;

function browserSafeHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  throw new Error("Web Crypto is required to start an offline round.");
}

function getEntity(pack: OfflineCountryPack, state: OfflineRoundState) {
  const entity = pack.entities.find(
    (candidate) => candidate.id === state.entityId,
  );
  if (!entity || pack.snapshotKey !== state.snapshotKey) {
    throw new Error(
      "The saved offline round does not match the active country pack.",
    );
  }
  return entity;
}

function asNormalizedEntity(entity: OfflineCountryEntity): NormalizedEntity {
  return {
    ...entity,
    category: "countries",
    wikipediaTitle: null,
    metadata: {
      continents: entity.continents,
      centroidLatitude: entity.latitude,
      centroidLongitude: entity.longitude,
    },
    sourceFingerprint: entity.qid,
  };
}

export function getEffectiveOfflineClues(
  entity: OfflineCountryEntity,
  mode: GameMode,
  continent: OfflineRoundState["continent"] = null,
) {
  return entity.clues.filter(
    (clue) =>
      (!clue.mode || clue.mode === mode) &&
      (!continent || clue.key !== "continent"),
  );
}

function getClues(
  entity: OfflineCountryEntity,
  state: OfflineRoundState,
  revealAll = false,
): RoundClue[] {
  const revealed = new Set(state.revealedClueKeys);
  return getEffectiveOfflineClues(entity, state.mode, state.continent).map(
    (clue) => {
      const isRevealed = revealAll || revealed.has(clue.key);
      return {
        ...clue,
        value: isRevealed ? clue.value : null,
        prefetchedValue: clue.value,
        isRevealed,
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

function buildProgress(
  entity: OfflineCountryEntity,
  state: OfflineRoundState,
  revealAll = false,
): OfflineRoundProgress {
  const effectiveClues = getEffectiveOfflineClues(
    entity,
    state.mode,
    state.continent,
  );
  const revealed = new Set(state.revealedClueKeys);
  return {
    playOrigin: "offline",
    roundId: state.roundId,
    kind: "standard",
    category: "countries",
    continent: state.continent,
    mode: state.mode,
    clues: getClues(entity, state, revealAll),
    revealedClues: effectiveClues.filter((clue) => revealed.has(clue.key)),
    remainingClues: Math.max(
      effectiveClues.length - state.revealedClueKeys.length,
      0,
    ),
    canGuess: state.canGuess,
    guesses: state.guesses,
  };
}

function getScore(revealCount: number, method?: GuessRoundInput["method"]) {
  const index = Math.min(
    Math.max(revealCount, 1) - 1,
    SCORE_BY_REVEAL_INDEX.length - 1,
  );
  const score = SCORE_BY_REVEAL_INDEX[index] ?? 10;
  return method === "map" ? Math.floor(score / 2) : score;
}

export function startOfflineRound(
  unvalidatedPack: OfflineCountryPack,
  input: Pick<StartRoundInput, "continent" | "mode" | "seed"> = {},
): OfflineStartRoundResult {
  const pack = offlineCountryPackSchema.parse(unvalidatedPack);
  const candidates = pack.entities.filter(
    (entity) => !input.continent || entity.continents.includes(input.continent),
  );
  if (candidates.length === 0) {
    throw new Error("No playable countries are available for that continent.");
  }
  const seed = input.seed ?? randomId();
  const entity = candidates[browserSafeHash(seed) % candidates.length]!;
  const mode = input.mode ?? "classic";
  const clues = getEffectiveOfflineClues(entity, mode, input.continent ?? null);
  if (clues.length === 0) {
    throw new Error(
      "The selected country has no playable clues for this mode.",
    );
  }
  const now = new Date().toISOString();
  const state: OfflineRoundState = {
    schemaVersion: OFFLINE_SCHEMA_VERSION,
    playOrigin: "offline",
    roundId: randomId(),
    snapshotKey: pack.snapshotKey,
    entityId: entity.id,
    continent: input.continent ?? null,
    mode,
    seed,
    revealedClueKeys: mode === "classic" && clues[0] ? [clues[0].key] : [],
    guesses: [],
    canGuess: mode === "classic",
    totalClues: clues.length,
    startedAt: now,
    updatedAt: now,
  };
  return { state, ...buildProgress(entity, state) };
}

export function resumeOfflineRound(
  unvalidatedPack: OfflineCountryPack,
  unvalidatedState: OfflineRoundState,
): OfflineStartRoundResult {
  const pack = offlineCountryPackSchema.parse(unvalidatedPack);
  const state = offlineRoundStateSchema.parse(unvalidatedState);
  const entity = getEntity(pack, state);
  return { state, ...buildProgress(entity, state) };
}

export function revealOfflineClue(
  pack: OfflineCountryPack,
  unvalidatedState: OfflineRoundState,
  clueKey: string,
): OfflineRevealClueResult {
  const state = offlineRoundStateSchema.parse(unvalidatedState);
  const entity = getEntity(pack, state);
  if (state.mode !== "blurred-lines") {
    throw new Error(
      "Manual clue reveals are only available in blurred lines mode.",
    );
  }
  const effectiveClues = getEffectiveOfflineClues(
    entity,
    state.mode,
    state.continent,
  );
  const selected = effectiveClues.find((clue) => clue.key === clueKey);
  if (!selected) throw new Error("That clue does not exist for this round.");
  if (state.revealedClueKeys.includes(clueKey)) {
    throw new Error("That clue is already revealed.");
  }
  const unlockState = effectiveClues.map((clue) => ({
    key: clue.key,
    spoilerLevel: clue.spoilerLevel,
    isRevealed: state.revealedClueKeys.includes(clue.key),
  }));
  const selectedState = unlockState.find((clue) => clue.key === clueKey)!;
  const rounds = getClueUnlockRoundsRemaining(unlockState, selectedState);
  if (rounds > 0) {
    throw new Error(
      `Reveal ${rounds} more ${rounds === 1 ? "clue" : "clues"} to unlock this field.`,
    );
  }
  const next = {
    ...state,
    revealedClueKeys: [...state.revealedClueKeys, clueKey],
    canGuess: true,
    updatedAt: new Date().toISOString(),
  };
  return { state: next, ...buildProgress(entity, next) };
}

function completedResult(
  entity: OfflineCountryEntity,
  state: OfflineRoundState,
  isCorrect: boolean,
  method?: GuessRoundInput["method"],
  guessedCountry?: ReturnType<typeof getGuessedCountryMapData>,
): OfflineGuessRoundResult {
  return {
    state: null,
    ...buildProgress(entity, state, true),
    isCorrect,
    isComplete: true,
    canonicalAnswer: entity.canonicalAnswer,
    score: isCorrect ? getScore(state.revealedClueKeys.length, method) : 0,
    direction: guessedCountry?.direction ?? null,
    guessedCountry,
    solutionCountry: getSolutionCountryMapData(asNormalizedEntity(entity)),
  };
}

export function submitOfflineGuess(
  pack: OfflineCountryPack,
  unvalidatedState: OfflineRoundState,
  guess: string,
  method?: GuessRoundInput["method"],
): OfflineGuessRoundResult {
  const state = offlineRoundStateSchema.parse(unvalidatedState);
  const entity = getEntity(pack, state);
  if (state.mode === "blurred-lines" && !state.canGuess) {
    throw new Error("Reveal a clue before guessing.");
  }
  const normalizedEntity = asNormalizedEntity(entity);
  const normalizedEntities = pack.entities.map(asNormalizedEntity);
  const isCorrect = matchesEntityGuess(normalizedEntity, guess);
  const guessedCountry = isCorrect
    ? null
    : getGuessedCountryMapData(guess, normalizedEntity, normalizedEntities);
  if (isCorrect)
    return completedResult(entity, state, true, method, guessedCountry);

  const guesses = [
    ...state.guesses,
    {
      name: guess,
      direction: guessedCountry?.direction ?? null,
      mapData: guessedCountry,
    },
  ];
  const attemptedState = { ...state, guesses };

  const effectiveClues = getEffectiveOfflineClues(
    entity,
    state.mode,
    state.continent,
  );
  if (state.mode === "blurred-lines") {
    if (state.revealedClueKeys.length >= effectiveClues.length) {
      return completedResult(
        entity,
        attemptedState,
        false,
        method,
        guessedCountry,
      );
    }
    const next = {
      ...state,
      guesses,
      canGuess: false,
      updatedAt: new Date().toISOString(),
    };
    return {
      state: next,
      ...buildProgress(entity, next),
      isCorrect: false,
      isComplete: false,
      canonicalAnswer: null,
      score: 0,
      direction: guessedCountry?.direction ?? null,
      guessedCountry,
    };
  }
  const revealed = new Set(state.revealedClueKeys);
  const nextClue = effectiveClues.find((clue) => !revealed.has(clue.key));
  if (!nextClue)
    return completedResult(
      entity,
      attemptedState,
      false,
      method,
      guessedCountry,
    );
  const next = {
    ...state,
    guesses,
    revealedClueKeys: [...state.revealedClueKeys, nextClue.key],
    updatedAt: new Date().toISOString(),
  };
  return {
    state: next,
    ...buildProgress(entity, next),
    isCorrect: false,
    isComplete: false,
    canonicalAnswer: null,
    score: 0,
    direction: guessedCountry?.direction ?? null,
    guessedCountry,
  };
}

export function giveUpOfflineRound(
  pack: OfflineCountryPack,
  unvalidatedState: OfflineRoundState,
): OfflineGuessRoundResult {
  const state = offlineRoundStateSchema.parse(unvalidatedState);
  const entity = getEntity(pack, state);
  return completedResult(entity, state, false);
}
