"use client";

import { normalizeGuess } from "@/src/lib/game/answer-matching";

import {
  getMenuMessage,
  getMessageAppearance,
  isClueLocked,
  toPlayableClues,
} from "@/src/components/game-shell/utils";
import type {
  ActiveRound,
  GameShellProps,
  RoundOutcome,
} from "@/src/components/game-shell/types";
import type {
  GameMode,
  GuessRoundResult,
  RevealClueResult,
  StartRoundResult,
} from "@/src/lib/types";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

export function useGameShellController({
  categories,
  countryOptions,
}: GameShellProps) {
  const defaultCategory =
    categories.find((category) => category.entityCount > 0)?.id ?? null;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    defaultCategory,
  );
  const [selectedMode, setSelectedMode] = useState<GameMode | null>("classic");
  const [round, setRound] = useState<ActiveRound | null>(null);
  const [result, setResult] = useState<RoundOutcome | null>(null);
  const [guess, setGuess] = useState("");
  const [guessedEntities, setGuessedEntities] = useState<string[]>([]);
  const [message, setMessage] = useState(
    getMenuMessage(defaultCategory, "classic"),
  );
  const [score, setScore] = useState<number | null>(null);
  const [isSyncingReveal, setIsSyncingReveal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const validCountryLookup = new Map(
    countryOptions.map((option) => [normalizeGuess(option), option]),
  );

  const totalEntityCount = categories.reduce(
    (sum, category) => sum + category.entityCount,
    0,
  );
  const totalSelectedEntityCount =
    selectedCategory === "random"
      ? totalEntityCount
      : (categories.find((category) => category.id === selectedCategory)
          ?.entityCount ?? 0);

  const view = round ? "round" : result ? "result" : "menu";
  const showRandomMix = categories.length > 1;
  const currentMode = round?.mode ?? result?.mode ?? selectedMode;
  const currentClues = round?.clues ?? result?.clues ?? [];
  const visibleClassicClues = currentClues.filter((clue) => clue.isRevealed);
  const isCountryRound = round?.category === "countries";
  const hasGuess = guess.trim().length > 0;
  const normalizedGuess = normalizeGuess(guess);
  const normalizedGuessedEntities = new Set(
    guessedEntities.map((entry) => normalizeGuess(entry)),
  );
  const isCountryGuessValid =
    !isCountryRound || validCountryLookup.has(normalizedGuess);
  const isAlreadyGuessed =
    hasGuess && normalizedGuessedEntities.has(normalizedGuess);
  const availableCountryOptions = countryOptions.filter(
    (option) => !normalizedGuessedEntities.has(normalizeGuess(option)),
  );
  const canSubmitGuess = Boolean(
    round &&
    round.canGuess &&
    hasGuess &&
    isCountryGuessValid &&
    !isAlreadyGuessed &&
    !isPending &&
    !isSyncingReveal,
  );
  const selectedCategoryMeta = categories.find(
    (category) => category.id === selectedCategory,
  );
  const selectedCategoryLabel =
    selectedCategory === "random"
      ? "Mixed category"
      : (selectedCategoryMeta?.label ?? "Pick a category");
  const currentCategory =
    round?.category ?? result?.category ?? selectedCategory;
  const currentCategoryMeta = categories.find(
    (category) => category.id === currentCategory,
  );
  const currentCategoryLabel =
    currentCategoryMeta?.label ??
    (currentCategory === "random" ? "Mixed category" : selectedCategoryLabel);
  const canStartRound = Boolean(
    selectedCategory &&
    selectedMode &&
    totalSelectedEntityCount > 0 &&
    !isPending,
  );
  const revealedCount = currentClues.filter((clue) => clue.isRevealed).length;
  const displayScore = result?.score ?? score ?? 0;
  const statusAppearance = getMessageAppearance(
    message,
    result?.status ?? null,
  );
  const isBusy = isPending || isSyncingReveal;
  const guessButtonLabel = isBusy
    ? "..."
    : round?.canGuess
      ? "Guess"
      : currentMode === "blurred-lines"
        ? "Reveal"
        : "Locked";
  const validationMessage =
    isCountryRound && hasGuess && !isCountryGuessValid
      ? "Pick a listed country."
      : isAlreadyGuessed
        ? "Already tried."
        : null;

  function handleCategorySelect(categoryId: string) {
    if (categoryId === "random") {
      if (totalEntityCount === 0) {
        setMessage("Category not ready.");
        return;
      }

      setSelectedCategory(categoryId);
      setMessage(getMenuMessage(categoryId, selectedMode));
      return;
    }

    const category = categories.find((entry) => entry.id === categoryId);

    if (!category || category.entityCount === 0) {
      setMessage("Category not ready.");
      return;
    }

    setSelectedCategory(categoryId);
    setMessage(getMenuMessage(categoryId, selectedMode));
  }

  function handleModeSelect(mode: GameMode) {
    if (!selectedCategory) {
      setMessage("Pick a category first.");
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
        setMessage("Round failed. Retry.");
        return;
      }

      const data = (await response.json()) as StartRoundResult;
      setRound(data);
      setMessage(data.mode === "blurred-lines" ? "Tap a row." : "Round live.");
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
          setMessage("Reveal failed.");
          return;
        }

        const data = (await response.json()) as RevealClueResult;
        setRound(data);
        setMessage(data.remainingClues === 0 ? "Last clue." : "Clue unlocked.");
      } catch {
        setRound(previousRound);
        setMessage("Reveal failed.");
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
      setMessage("Pick a listed country.");
      return;
    }

    if (!round.canGuess) {
      setMessage(
        round.mode === "blurred-lines"
          ? "Reveal a row."
          : "Wait for the next clue.",
      );
      return;
    }

    if (isAlreadyGuessed) {
      setMessage("Already tried.");
      return;
    }

    const submittedGuess = isCountryRound
      ? (validCountryLookup.get(normalizedGuess) ?? guess.trim())
      : guess.trim();

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
        setMessage("Guess failed.");
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
          kind: data.kind,
          category: data.category,
          mode: data.mode,
          clues: data.clues,
        });
        setMessage("Correct.");
        return;
      }

      if (data.isComplete) {
        setRound(null);
        setResult({
          status: "loss",
          canonicalAnswer: data.canonicalAnswer ?? "Unknown",
          score: 0,
          kind: data.kind,
          category: data.category,
          mode: data.mode,
          clues: data.clues,
        });
        setMessage(`Answer: ${data.canonicalAnswer ?? "Unknown"}.`);
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
          ? "Miss. Pick another row."
          : data.remainingClues === 0
            ? "Miss. Last chance."
            : "Miss. Next clue.",
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

  return {
    categories,
    availableCountryOptions,
    canStartRound,
    canSubmitGuess,
    clearForCategoryChoice,
    currentCategory,
    currentCategoryLabel,
    currentClues,
    currentMode,
    displayScore,
    guess,
    guessedEntities,
    guessButtonLabel,
    handleCategorySelect,
    handleGuessSubmit,
    handleModeSelect,
    isBusy,
    isCountryRound,
    message,
    result,
    revealClue,
    revealedCount,
    round,
    score,
    selectedCategory,
    selectedCategoryLabel,
    selectedMode,
    setGuess,
    showRandomMix,
    startRound,
    statusAppearance,
    totalEntityCount,
    totalSelectedEntityCount,
    validationMessage,
    view,
    visibleClassicClues,
  };
}
