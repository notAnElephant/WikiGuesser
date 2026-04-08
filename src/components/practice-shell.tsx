"use client";

import Confetti from "react-confetti";
import { normalizeGuess } from "@/src/lib/game/answer-matching";
import { splitCurrencyRevealSegments } from "@/src/lib/game/currency-censor";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";

import type {
  CategorySummary,
  EntityCategory,
  GameMode,
  GuessRoundResult,
  RevealClueResult,
  PlayableClue,
  RoundClue,
  StartRoundResult,
} from "@/src/lib/types";

interface PracticeShellProps {
  categories: CategorySummary[];
  countryOptions: string[];
}

type ActiveRound = StartRoundResult | RevealClueResult;

interface RoundOutcome {
  status: "win" | "loss";
  canonicalAnswer: string;
  score: number;
  category: EntityCategory;
  mode: GameMode;
  clues: RoundClue[];
}

const GAME_MODE_OPTIONS: Array<{
  id: GameMode;
  label: string;
  eyebrow: string;
  description: string;
  detail: string;
}> = [
  {
    id: "classic",
    label: "Classic",
    eyebrow: "Sequential reveals",
    description: "Miss a guess and the next clue appears automatically.",
    detail: "Best if you want the original one-clue-at-a-time pacing.",
  },
  {
    id: "blurred-lines",
    label: "Blurred lines",
    eyebrow: "Player-controlled reveals",
    description: "See every hint label in a wiki table and unblur the values in any order.",
    detail: "Each reveal unlocks one guess, so choose your next field carefully.",
  },
];

const pillButtonBase =
  "inline-flex flex-none items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0";
const primaryButtonClass = `${pillButtonBase} bg-[#0f766e] text-white dark:bg-[#24d4c2] dark:text-[#082825]`;
const secondaryButtonClass = `${pillButtonBase} bg-[rgba(15,118,110,0.14)] text-[#115e59] dark:bg-[rgba(45,212,191,0.16)] dark:text-[#8ff4e7]`;
const launchButtonClass = `${pillButtonBase} border border-[rgba(17,94,89,0.16)] bg-[linear-gradient(135deg,#fffaf2_0%,#f8ecce_46%,#f2d680_100%)] px-5 text-[#1f1b17] shadow-[0_14px_36px_rgba(83,58,20,0.16)] hover:shadow-[0_18px_42px_rgba(83,58,20,0.22)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#172130_0%,#1c2a3c_46%,#274256_100%)] dark:text-[#f5f7fb] dark:shadow-[0_14px_36px_rgba(0,0,0,0.36)] dark:hover:shadow-[0_18px_42px_rgba(0,0,0,0.46)]`;

function selectionCardClass(isActive: boolean, isDisabled = false): string {
  return `grid gap-3 rounded-[26px] border p-4 text-left transition ${
    isDisabled
      ? "cursor-not-allowed border-black/5 bg-[rgba(255,255,255,0.56)] opacity-55 dark:border-white/8 dark:bg-white/6"
      : isActive
        ? "border-[#0f766e] bg-[linear-gradient(160deg,rgba(15,118,110,0.14),rgba(255,255,255,0.92))] shadow-[0_18px_44px_rgba(15,118,110,0.12)] dark:border-[#24d4c2]/60 dark:bg-[linear-gradient(160deg,rgba(36,212,194,0.14),rgba(17,24,39,0.92))] dark:shadow-[0_18px_44px_rgba(0,0,0,0.28)]"
        : "border-black/10 bg-white/85 hover:-translate-y-0.5 dark:border-white/10 dark:bg-[rgba(13,21,32,0.84)]"
  }`;
}

function getMenuMessage(category: string | null, mode: GameMode | null): string {
  if (!category) {
    return "Choose a category to continue.";
  }

  if (!mode) {
    return "Choose a game mode for that category.";
  }

  return "Start a round when you're ready.";
}

function hasHiddenSafeClues(clues: RoundClue[]): boolean {
  return clues.some((clue) => clue.spoilerLevel === "safe" && !clue.isRevealed);
}

function isClueLocked(clues: RoundClue[], clue: RoundClue): boolean {
  return clue.spoilerLevel === "late" && hasHiddenSafeClues(clues);
}

function toPlayableClues(clues: RoundClue[]): PlayableClue[] {
  return clues
    .filter((clue) => clue.isRevealed)
    .map((clue) => ({
      key: clue.key,
      label: clue.label,
      value: clue.value ?? clue.prefetchedValue,
      difficulty: clue.difficulty,
      spoilerLevel: clue.spoilerLevel,
    }));
}

function renderClueValue(clue: Pick<RoundClue, "key" | "value">): ReactNode {
  if (!clue.value) {
    return null;
  }

  if (clue.key !== "currency") {
    return clue.value;
  }

  const segments = splitCurrencyRevealSegments(clue.value);

  if (!segments.some((segment) => segment.isBlurred)) {
    return clue.value;
  }

  return segments.map((segment, index) =>
    segment.isBlurred ? (
      <span className="inline-block align-baseline" key={`${segment.text}-${index}`}>
        <span
          aria-hidden="true"
          className="select-none rounded-[0.45rem] bg-black/6 px-1 text-[transparent] [text-shadow:0_0_10px_rgba(31,27,23,0.88)] blur-[2.6px] dark:bg-white/10 dark:[text-shadow:0_0_10px_rgba(245,247,251,0.92)]"
        >
          {segment.text}
        </span>
        <span className="sr-only">country reference hidden</span>
      </span>
    ) : (
      <span key={`${segment.text}-${index}`}>{segment.text}</span>
    ),
  );
}

function useViewportSize() {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function updateViewport() {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  return viewport;
}

export function PracticeShell({ categories, countryOptions }: PracticeShellProps) {
  const defaultCategory = categories[0]?.id ?? null;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(defaultCategory);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>("classic");
  const [round, setRound] = useState<ActiveRound | null>(null);
  const [result, setResult] = useState<RoundOutcome | null>(null);
  const [guess, setGuess] = useState("");
  const [guessedEntities, setGuessedEntities] = useState<string[]>([]);
  const [message, setMessage] = useState(getMenuMessage(defaultCategory, "classic"));
  const [score, setScore] = useState<number | null>(null);
  const [isSyncingReveal, setIsSyncingReveal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const validCountryLookup = new Map(countryOptions.map((option) => [normalizeGuess(option), option]));
  const view = round ? "round" : result ? "result" : "menu";
  const showRandomMix = categories.length > 1;
  const currentMode = round?.mode ?? result?.mode ?? selectedMode;
  const currentClues = round?.clues ?? result?.clues ?? [];
  const visibleClassicClues = currentClues.filter((clue) => clue.isRevealed);
  const isCountryRound = round?.category === "countries";
  const hasGuess = guess.trim().length > 0;
  const normalizedGuess = normalizeGuess(guess);
  const normalizedGuessedEntities = new Set(guessedEntities.map((entry) => normalizeGuess(entry)));
  const isCountryGuessValid = !isCountryRound || validCountryLookup.has(normalizedGuess);
  const isAlreadyGuessed = hasGuess && normalizedGuessedEntities.has(normalizedGuess);
  const availableCountryOptions = countryOptions.filter((option) => !normalizedGuessedEntities.has(normalizeGuess(option)));
  const canSubmitGuess = Boolean(
    round && round.canGuess && hasGuess && isCountryGuessValid && !isAlreadyGuessed && !isPending && !isSyncingReveal,
  );
  const selectedCategoryMeta = categories.find((category) => category.id === selectedCategory);
  const selectedCategoryLabel = selectedCategory === "random" ? "Random mix" : selectedCategoryMeta?.label ?? "Choose a category";
  const selectedModeMeta = GAME_MODE_OPTIONS.find((mode) => mode.id === selectedMode);
  const currentCategory = round?.category ?? result?.category ?? selectedCategory;
  const currentCategoryMeta = categories.find((category) => category.id === currentCategory);
  const currentCategoryLabel = currentCategoryMeta?.label ?? (currentCategory === "random" ? "Random mix" : selectedCategoryLabel);
  const currentModeLabel = GAME_MODE_OPTIONS.find((mode) => mode.id === currentMode)?.label ?? "Mode pending";
  const canStartRound = Boolean(selectedCategory && selectedMode && !isPending);

  function handleCategorySelect(categoryId: string) {
    setSelectedCategory(categoryId);
    setMessage(getMenuMessage(categoryId, selectedMode));
  }

  function handleModeSelect(mode: GameMode) {
    if (!selectedCategory) {
      setMessage("Choose a category before you pick a game mode.");
      return;
    }

    setSelectedMode(mode);
    setMessage(getMenuMessage(selectedCategory, mode));
  }

  function startRound() {
    if (!selectedCategory || !selectedMode) {
      setMessage(getMenuMessage(selectedCategory, selectedMode));
      return;
    }

    setGuess("");
    setGuessedEntities([]);
    setScore(null);
    setResult(null);
    setIsSyncingReveal(false);

    startTransition(async () => {
      const response = await fetch("/api/rounds/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: selectedCategory,
          mode: selectedMode,
        }),
      });

      if (!response.ok) {
        setMessage("Couldn't start a round. Please try again.");
        return;
      }

      const data = (await response.json()) as StartRoundResult;
      setRound(data);
      setMessage(
        data.mode === "blurred-lines"
          ? "Round started. Unblur a field to unlock your first guess."
          : "Round started. Submit a guess whenever you're ready.",
      );
    });
  }

  function revealClue(clueKey: string) {
    if (!round || isSyncingReveal) {
      return;
    }

    const clue = round.clues.find((entry) => entry.key === clueKey);

    if (!clue || clue.isRevealed || isClueLocked(round.clues, clue)) {
      return;
    }

    const previousRound = round;
    const optimisticClues = round.clues.map((entry) =>
      entry.key === clueKey
        ? {
            ...entry,
            isRevealed: true,
            value: entry.prefetchedValue,
          }
        : entry,
    );

    setRound({
      ...round,
      clues: optimisticClues,
      revealedClues: toPlayableClues(optimisticClues),
      remainingClues: Math.max(round.remainingClues - 1, 0),
      canGuess: true,
    });
    setIsSyncingReveal(true);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/rounds/${round.roundId}/reveal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: round.token,
            clueKey,
          }),
        });

        if (!response.ok) {
          setRound(previousRound);
          setMessage("Couldn't reveal that field. Try another row.");
          return;
        }

        const data = (await response.json()) as RevealClueResult;
        setRound(data);
        setMessage(
          data.remainingClues === 0
            ? "Last field revealed. You have one final guess."
            : "Field revealed. Take a guess or unblur another row.",
        );
      } catch {
        setRound(previousRound);
        setMessage("Couldn't reveal that field. Try another row.");
      } finally {
        setIsSyncingReveal(false);
      }
    });
  }

  function submitGuess() {
    if (!round || !guess.trim()) {
      return;
    }

    if (isCountryRound && !isCountryGuessValid) {
      setMessage("Choose a country from the suggestions before submitting.");
      return;
    }

    if (!round.canGuess) {
      setMessage(
        round.mode === "blurred-lines"
          ? "Unblur a field before your next guess."
          : "Wait for the next clue before guessing again.",
      );
      return;
    }

    if (isAlreadyGuessed) {
      setMessage("You already tried that one. Pick a new entity.");
      return;
    }

    const submittedGuess = isCountryRound ? (validCountryLookup.get(normalizedGuess) ?? guess.trim()) : guess.trim();

    startTransition(async () => {
      const response = await fetch(`/api/rounds/${round.roundId}/guess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: round.token,
          guess: submittedGuess,
        }),
      });

      if (!response.ok) {
        setMessage("Couldn't submit that guess. Try again or start a new round.");
        return;
      }

      const data = (await response.json()) as GuessRoundResult;
      setGuessedEntities((current) => [...current, submittedGuess]);
      setScore(data.score || null);
      setGuess("");

      if (data.isCorrect) {
        setRound(null);
        setResult({
          status: "win",
          canonicalAnswer: data.canonicalAnswer ?? "Unknown",
          score: data.score,
          category: data.category,
          mode: data.mode,
          clues: data.clues,
        });
        setMessage(`Correct. ${data.canonicalAnswer} for ${data.score} points.`);
        return;
      }

      if (data.isComplete) {
        setRound(null);
        setResult({
          status: "loss",
          canonicalAnswer: data.canonicalAnswer ?? "Unknown",
          score: 0,
          category: data.category,
          mode: data.mode,
          clues: data.clues,
        });
        setMessage(`Out of clues. The answer was ${data.canonicalAnswer}.`);
        return;
      }

      setRound({
        roundId: data.roundId,
        token: data.token!,
        category: data.category,
        mode: data.mode,
        clues: data.clues,
        revealedClues: data.revealedClues,
        remainingClues: data.remainingClues,
        canGuess: data.canGuess,
      });

      setMessage(
        data.mode === "blurred-lines"
          ? "Not this time. Unblur another field to earn the next guess."
          : data.remainingClues === 0
            ? "Not this time. That was the last clue, so you get one final guess."
            : "Not this time. Here's another clue.",
      );
    });
  }

  function handleGuessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitGuess();
  }

  function clearForCategoryChoice() {
    setRound(null);
    setResult(null);
    setGuess("");
    setGuessedEntities([]);
    setScore(null);
    setIsSyncingReveal(false);
    setMessage(getMenuMessage(selectedCategory, selectedMode));
  }

  if (view === "menu") {
    return (
      <div className="flex min-h-[calc(100dvh-1rem)] flex-col gap-4 sm:min-h-[calc(100dvh-1.5rem)] sm:gap-5">
        <header className="grid gap-4 rounded-[30px] border border-black/10 bg-[radial-gradient(circle_at_top_left,rgba(249,214,129,0.35),transparent_28%),linear-gradient(180deg,rgba(255,251,245,0.97),rgba(255,247,238,0.9))] p-5 shadow-[0_24px_60px_rgba(53,36,22,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(36,212,194,0.16),transparent_24%),linear-gradient(180deg,rgba(12,19,30,0.97),rgba(18,27,40,0.94))] dark:shadow-[0_24px_60px_rgba(0,0,0,0.34)] sm:p-7">
          <div className="grid gap-3 sm:grid-cols-[1.3fr_0.7fr] sm:items-end">
            <div>
              <p className="m-0 mb-3 text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#115e59] dark:text-[#75e6d7]">Play now</p>
              <h1 className="m-0 max-w-[10ch] font-serif-display text-[clamp(2.3rem,8vw,4.3rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-[#1f1b17] dark:text-[#f5f7fb]">
                WikiGuesser
              </h1>
              <p className="m-0 mt-4 max-w-2xl leading-7 text-[#6b6259] dark:text-[#9aa9bb]">
                {showRandomMix
                  ? "Pick a category first, then choose whether you want classic pacing or a player-controlled clue table."
                  : "Countries are the only live category right now, so choose a mode and jump straight in."}
              </p>
            </div>
            <div className="grid gap-3 rounded-[26px] border border-[rgba(17,94,89,0.08)] bg-white/80 p-4 dark:border-white/10 dark:bg-[rgba(255,255,255,0.06)]">
              <span className="text-sm uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">Next round</span>
              <strong className="font-serif-display text-[clamp(1.2rem,3vw,1.7rem)] leading-[1.05] text-[#1f1b17] dark:text-[#f5f7fb]">
                {selectedCategoryLabel}
              </strong>
              <span className="text-sm leading-6 text-[#6b6259] dark:text-[#9aa9bb]">
                {selectedModeMeta?.label ?? "Classic is selected by default."}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-5 rounded-[30px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,251,245,0.96),rgba(255,247,238,0.86))] p-5 shadow-[0_24px_60px_rgba(53,36,22,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(13,21,32,0.96),rgba(17,27,40,0.88))] dark:shadow-[0_24px_60px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="m-0 mb-2 text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#115e59] dark:text-[#75e6d7]">Step 1</p>
              <h2 className="m-0 font-serif-display text-[clamp(1.75rem,5vw,2.8rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[#1f1b17] dark:text-[#f5f7fb]">
                Choose a category.
              </h2>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {showRandomMix ? (
              <button className={selectionCardClass(selectedCategory === "random")} onClick={() => handleCategorySelect("random")} type="button">
                <span className="text-[0.74rem] font-bold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">Wildcard</span>
                <strong className="font-serif-display text-2xl tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">Mixed deck</strong>
                <span className="leading-6 text-[#6b6259] dark:text-[#9aa9bb]">A surprise mix pulled from every category.</span>
              </button>
            ) : null}
            {categories.map((category) => (
              <button
                className={selectionCardClass(selectedCategory === category.id)}
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                type="button"
              >
                <span className="text-[0.74rem] font-bold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">Category</span>
                <strong className="font-serif-display text-2xl tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">{category.label}</strong>
                <span className="leading-6 text-[#6b6259] dark:text-[#9aa9bb]">{category.description}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 rounded-[26px] border border-[rgba(17,94,89,0.08)] bg-white/70 p-4 dark:border-white/10 dark:bg-[rgba(255,255,255,0.05)]">
            <div>
              <p className="m-0 mb-2 text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#115e59] dark:text-[#75e6d7]">Step 2</p>
              <h3 className="m-0 font-serif-display text-[clamp(1.4rem,4vw,2.2rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                Choose a game mode.
              </h3>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {GAME_MODE_OPTIONS.map((mode) => {
                const isDisabled = !selectedCategory;

                return (
                  <button
                    className={selectionCardClass(selectedMode === mode.id, isDisabled)}
                    disabled={isDisabled}
                    key={mode.id}
                    onClick={() => handleModeSelect(mode.id)}
                    type="button"
                  >
                    <span className="text-[0.74rem] font-bold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">{mode.eyebrow}</span>
                    <strong className="font-serif-display text-2xl tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">{mode.label}</strong>
                    <span className="leading-6 text-[#6b6259] dark:text-[#9aa9bb]">{mode.description}</span>
                    <span className="text-sm leading-6 text-[#8a8278] dark:text-[#7f8fa3]">{mode.detail}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 rounded-[22px] border border-[rgba(17,94,89,0.08)] bg-[rgba(15,118,110,0.04)] p-4 dark:border-white/10 dark:bg-[rgba(36,212,194,0.06)]">
              <div>
                <p className="m-0 mb-2 text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#115e59] dark:text-[#75e6d7]">Step 3</p>
                <h3 className="m-0 font-serif-display text-[clamp(1.25rem,3vw,1.8rem)] font-semibold leading-[1] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                  Start the round.
                </h3>
              </div>
              <button className={launchButtonClass} disabled={!canStartRound} onClick={startRound} type="button">
                Start round
              </button>
            </div>
          </div>

          <p className="m-0 text-sm leading-6 text-[#6b6259] dark:text-[#9aa9bb]">{message}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-1rem)] flex-col gap-2 sm:min-h-[calc(100dvh-1.5rem)] sm:gap-3">
      <header className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 mb-3 text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#115e59] dark:text-[#75e6d7]">
            {view === "round" ? "Now playing" : "Round complete"}
          </p>
          <h1 className="m-0 max-w-[11ch] font-serif-display text-[clamp(2.1rem,7vw,3.7rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-[#1f1b17] dark:text-[#f5f7fb] sm:max-w-none">
            {currentMode === "blurred-lines"
              ? view === "round"
                ? "Lift the blur only where you need it."
                : "The dossier is open. Review every field."
              : view === "round"
                ? "Name it before the clues give it away."
                : "Here's how that round ended."}
          </h1>
        </div>
        <div className="scrollbar-hidden flex gap-3 overflow-x-auto">
          <span className="whitespace-nowrap rounded-full bg-white/75 px-4 py-2 text-sm text-[#115e59] dark:bg-white/8 dark:text-[#8ff4e7]">{currentCategoryLabel}</span>
          <span className="whitespace-nowrap rounded-full bg-white/75 px-4 py-2 text-sm text-[#115e59] dark:bg-white/8 dark:text-[#8ff4e7]">{currentModeLabel}</span>
          <span className="whitespace-nowrap rounded-full bg-white/75 px-4 py-2 text-sm text-[#115e59] dark:bg-white/8 dark:text-[#8ff4e7]">{score ?? 0} pts</span>
        </div>
      </header>

      <section className="relative grid flex-1 gap-4 rounded-3xl border border-black/10 bg-[linear-gradient(180deg,rgba(255,251,245,0.96),rgba(255,247,238,0.86))] p-4 shadow-[0_24px_60px_rgba(53,36,22,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(13,21,32,0.96),rgba(17,27,40,0.88))] dark:shadow-[0_24px_60px_rgba(0,0,0,0.34)] sm:rounded-[30px] sm:p-[1.15rem]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="m-0 mb-3 text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#115e59] dark:text-[#75e6d7]">
              {round ? (currentMode === "blurred-lines" ? "Wikipedia dossier" : "Clues so far") : "Answer revealed"}
            </p>
            <h2 className="m-0 max-w-[13ch] font-serif-display text-[clamp(1.75rem,5vw,2.8rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[#1f1b17] dark:text-[#f5f7fb]">
              {round
                ? currentMode === "blurred-lines"
                  ? "Reveal only the rows you want to spend."
                  : "Make your guess before the next reveal."
                : "Take a look, then jump into another round."}
            </h2>
          </div>
          {round ? (
            <button className={launchButtonClass} disabled={isPending} onClick={startRound} type="button">
              New round
            </button>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button className={primaryButtonClass} disabled={isPending} onClick={startRound} type="button">
                Play again
              </button>
              <button className={secondaryButtonClass} disabled={isPending} onClick={clearForCategoryChoice} type="button">
                Back to menu
              </button>
            </div>
          )}
        </div>

        <p className="m-0 leading-7 text-[#6b6259] dark:text-[#9aa9bb]">{message}</p>

        {currentMode === "blurred-lines" ? (
          <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-[28px] border border-[#a2a9b1] bg-[#f8f9fa] shadow-[0_18px_38px_rgba(60,64,67,0.08)] dark:border-white/10 dark:bg-[#111a27] dark:shadow-[0_18px_38px_rgba(0,0,0,0.34)]">
            <table className="w-full border-collapse text-left text-sm text-[#202122] dark:text-[#edf3fa]">
              <caption className="border-b border-[#c8ccd1] bg-[#eaecf0] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[#54595d] dark:border-white/10 dark:bg-[#182231] dark:text-[#99a9bc]">
                Clue dossier
              </caption>
              <thead>
                <tr className="bg-white text-xs uppercase tracking-[0.16em] text-[#54595d] dark:bg-[#101926] dark:text-[#99a9bc]">
                  <th className="w-[36%] border-b border-r border-[#c8ccd1] px-4 py-3 font-semibold dark:border-white/10">Field</th>
                  <th className="border-b border-[#c8ccd1] px-4 py-3 font-semibold dark:border-white/10">Data</th>
                </tr>
              </thead>
              <tbody>
                {currentClues.map((clue, index) => {
                  const isLocked = Boolean(round) && isClueLocked(currentClues, clue);

                  return (
                    <tr
                      className={`${index % 2 === 0 ? "bg-white dark:bg-[#121c2a]" : "bg-[#f8f9fa] dark:bg-[#162231]"} ${isLocked ? "opacity-55" : ""}`}
                      key={clue.key}
                    >
                      <th className="border-r border-t border-[#c8ccd1] px-4 py-3 align-top font-semibold text-[#202122] dark:border-white/10 dark:text-[#edf3fa]">
                        <span>{clue.label}</span>
                      </th>
                      <td className="border-t border-[#c8ccd1] px-4 py-3 align-top dark:border-white/10">
                        {clue.isRevealed ? (
                          <span className="text-[1.02rem] leading-7 text-[#202122] dark:text-[#edf3fa]">{renderClueValue(clue)}</span>
                        ) : round ? (
                          isLocked ? (
                            <div className="rounded-lg bg-[linear-gradient(90deg,rgba(162,169,177,0.12),rgba(162,169,177,0.22),rgba(162,169,177,0.12))] px-4 py-3 text-transparent blur-[1.2px] select-none dark:bg-[linear-gradient(90deg,rgba(115,128,146,0.18),rgba(115,128,146,0.3),rgba(115,128,146,0.18))]">
                              Hidden until revealed
                            </div>
                          ) : (
                            <button
                              aria-label={`Reveal ${clue.label}`}
                              className="block w-full rounded-lg bg-transparent p-0 text-left transition hover:bg-[rgba(234,236,240,0.72)] disabled:cursor-not-allowed dark:hover:bg-white/6"
                              disabled={isSyncingReveal || isPending}
                              onClick={() => revealClue(clue.key)}
                              type="button"
                            >
                              <span className="block rounded-lg bg-[linear-gradient(90deg,rgba(162,169,177,0.18),rgba(162,169,177,0.32),rgba(162,169,177,0.18))] px-4 py-3 text-transparent blur-[1.2px] select-none dark:bg-[linear-gradient(90deg,rgba(115,128,146,0.22),rgba(115,128,146,0.36),rgba(115,128,146,0.22))]">
                                Hidden until revealed
                              </span>
                            </button>
                          )
                        ) : (
                          <span className="text-[1.02rem] leading-7 text-[#202122] dark:text-[#edf3fa]">{renderClueValue(clue)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <ol className="m-0 grid list-none gap-3 p-0">
            {visibleClassicClues.map((clue, index) => (
              <li className="grid gap-1 rounded-3xl border border-[rgba(17,94,89,0.08)] bg-white/85 p-4 dark:border-white/10 dark:bg-[rgba(255,255,255,0.06)]" key={clue.key}>
                <small className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">Clue {index + 1}</small>
                <span className="text-[#6b6259] dark:text-[#9aa9bb]">{clue.label}</span>
                <strong className="text-[clamp(1.2rem,4vw,1.7rem)] leading-[1.05] text-[#1f1b17] dark:text-[#f5f7fb]">{renderClueValue(clue)}</strong>
              </li>
            ))}
            {visibleClassicClues.length === 0 ? (
              <li className="grid min-h-45 content-center gap-1 rounded-3xl border border-[rgba(17,94,89,0.08)] bg-white/85 p-4 dark:border-white/10 dark:bg-[rgba(255,255,255,0.06)]">
                <small className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">Ready when you are</small>
                <strong className="text-[clamp(1.2rem,4vw,1.7rem)] leading-[1.05] text-[#1f1b17] dark:text-[#f5f7fb]">Pick a category and start.</strong>
                <span className="text-[#6b6259] dark:text-[#9aa9bb]">Your clues will appear here as soon as the round begins.</span>
              </li>
            ) : null}
          </ol>
        )}

        {round ? (
          <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={handleGuessSubmit}>
            <label className="grid flex-1 gap-2">
              <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">Guess</span>
              <input
                aria-label="Submit your entity guess"
                className="w-full rounded-[18px] border border-black/10 bg-white/85 px-4 py-4 text-[#1f1b17] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[rgba(15,118,110,0.22)] dark:border-white/10 dark:bg-[rgba(255,255,255,0.06)] dark:text-[#f5f7fb] dark:focus:border-[#24d4c2] dark:focus:ring-[rgba(36,212,194,0.22)]"
                list={isCountryRound ? "country-guess-options" : undefined}
                disabled={!round || isPending}
                onChange={(event) => setGuess(event.target.value)}
                placeholder={isCountryRound ? "Search countries" : "Type your answer"}
                type="text"
                value={guess}
              />
              {round.mode === "blurred-lines" ? (
                <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">
                  {round.canGuess
                    ? "You can guess now or keep revealing rows before you commit."
                    : "Unblur a row to unlock the next guess."}
                </span>
              ) : isCountryRound ? (
                <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">Start typing and pick a country from the suggestions.</span>
              ) : null}
              {guessedEntities.length > 0 ? (
                <>
                  <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">Already guessed</span>
                  <div className="flex flex-wrap gap-2">
                    {guessedEntities.map((entity) => (
                      <span
                        className="rounded-full border border-black/8 bg-white/70 px-3 py-1 text-xs font-medium text-[#6b6259] dark:border-white/10 dark:bg-white/6 dark:text-[#9aa9bb]"
                        key={entity}
                      >
                        {entity}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}
              {isCountryRound && hasGuess && !isCountryGuessValid ? (
                <span className="text-sm text-[#b45309]">Pick one of the suggested countries to submit this guess.</span>
              ) : isAlreadyGuessed ? (
                <span className="text-sm text-[#b45309]">You already guessed that entity in this round.</span>
              ) : null}
            </label>
            <button className={`${primaryButtonClass} sm:min-w-36`} disabled={!canSubmitGuess} type="submit">
              Submit guess
            </button>
          </form>
        ) : null}

        {isCountryRound ? (
          <datalist id="country-guess-options">
            {availableCountryOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        ) : null}

        <div className="flex flex-col gap-3 text-sm text-[#115e59] dark:text-[#8ff4e7] sm:flex-row sm:items-center sm:justify-between">
          <span>Remaining clues: {round?.remainingClues ?? 0}</span>
          <button className={secondaryButtonClass} disabled={isPending} onClick={clearForCategoryChoice} type="button">
            Back to menu
          </button>
        </div>
      </section>

      {result ? (
        <>
          {result.status === "win" && viewportWidth > 0 && viewportHeight > 0 ? (
            <Confetti
              gravity={0.16}
              height={viewportHeight}
              numberOfPieces={320}
              recycle={false}
              style={{ inset: 0, pointerEvents: "none", position: "fixed", zIndex: 60 }}
              width={viewportWidth}
            />
          ) : null}
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(25,20,14,0.46)] p-4 backdrop-blur-sm dark:bg-[rgba(3,7,14,0.62)]">
            <div
              aria-labelledby="round-result-title"
              aria-modal="true"
              className="w-full max-w-lg rounded-[32px] border border-[rgba(17,94,89,0.14)] bg-[linear-gradient(180deg,rgba(255,251,245,0.98),rgba(255,247,238,0.95))] p-6 shadow-[0_30px_80px_rgba(29,22,14,0.26)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,22,34,0.98),rgba(19,29,43,0.95))] dark:shadow-[0_30px_80px_rgba(0,0,0,0.46)] sm:p-7"
              role="dialog"
            >
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[rgba(15,118,110,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#115e59] dark:bg-[rgba(45,212,191,0.16)] dark:text-[#8ff4e7]">
                  {result.status === "win" ? "Solved" : "Round over"}
                </span>
                <span className="rounded-full bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b6259] dark:bg-white/8 dark:text-[#9aa9bb]">
                  {currentModeLabel}
                </span>
              </div>

              <h2
                className="mt-4 font-serif-display text-[clamp(2rem,7vw,3.2rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-[#1f1b17] dark:text-[#f5f7fb]"
                id="round-result-title"
              >
                {result.status === "win" ? result.canonicalAnswer : `The answer was ${result.canonicalAnswer}`}
              </h2>

              <p className="m-0 mt-4 leading-7 text-[#6b6259] dark:text-[#9aa9bb]">
                {result.status === "win"
                  ? `You locked it in with ${result.score} points on the board.`
                  : "You ran out of runway this time, but the full dossier is still visible behind the dialog."}
              </p>

              <div className="mt-5 grid gap-3 rounded-[24px] border border-[rgba(17,94,89,0.08)] bg-white/78 p-4 dark:border-white/10 dark:bg-[rgba(255,255,255,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">Category</span>
                  <strong className="text-[#1f1b17] dark:text-[#f5f7fb]">{currentCategoryLabel}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">Score</span>
                  <strong className="text-[#1f1b17] dark:text-[#f5f7fb]">{result.score} pts</strong>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button className={`${primaryButtonClass} flex-1`} disabled={isPending} onClick={startRound} type="button">
                  Play again
                </button>
                <button className={`${secondaryButtonClass} flex-1`} disabled={isPending} onClick={clearForCategoryChoice} type="button">
                  Back to menu
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
