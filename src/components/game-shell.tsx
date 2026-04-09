"use client";

import {normalizeGuess} from "@/src/lib/game/answer-matching";
import {splitCurrencyRevealSegments} from "@/src/lib/game/currency-censor";

import type {
  CategorySummary,
  EntityCategory,
  GameMode,
  GuessRoundResult,
  PlayableClue,
  RevealClueResult,
  RoundClue,
  StartRoundResult,
} from "@/src/lib/types";
import {
  ArrowRight,
  Ban,
  Building2,
  CircleAlert,
  Clock3,
  Compass,
  Eye,
  Globe2,
  GraduationCap,
  House,
  Landmark,
  Layers3,
  LoaderCircle,
  Lock,
  type LucideIcon,
  Map as MapIcon,
  MapPinned,
  Medal,
  PartyPopper,
  Play,
  RotateCcw,
  ScanSearch,
  Search,
  Shuffle,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import type {FormEvent, ReactNode} from "react";
import {useEffect, useState, useTransition} from "react";
import Confetti from "react-confetti";

interface GameShellProps {
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

interface CategoryCardMeta {
  icon: LucideIcon;
  accent: string;
  shortLabel: string;
}

const CATEGORY_META: Record<string, CategoryCardMeta> = {
  random: {
    icon: Shuffle,
    accent: "from-[#1d4ed8]/18 via-[#0ea5e9]/10 to-transparent dark:from-[#38bdf8]/22 dark:via-[#22d3ee]/10",
    shortLabel: "Mixed deck",
  },
  countries: {
    icon: Globe2,
    accent: "from-[#0f766e]/16 via-[#2dd4bf]/8 to-transparent dark:from-[#24d4c2]/20 dark:via-[#2dd4bf]/8",
    shortLabel: "World facts",
  },
  cities: {
    icon: Building2,
    accent: "from-[#b45309]/16 via-[#f59e0b]/8 to-transparent dark:from-[#f59e0b]/18 dark:via-[#fbbf24]/8",
    shortLabel: "Capital hunt",
  },
  people: {
    icon: Medal,
    accent: "from-[#7c3aed]/16 via-[#c084fc]/8 to-transparent dark:from-[#a855f7]/18 dark:via-[#d8b4fe]/8",
    shortLabel: "Famous names",
  },
};

const CLUE_ICON_MAP: Record<string, LucideIcon> = {
  "admin-region": MapIcon,
  area: Compass,
  award: Medal,
  capital: Landmark,
  citizenship: Globe2,
  continent: Globe2,
  country: Globe2,
  currency: Trophy,
  education: GraduationCap,
  elevation: MapPinned,
  field: Sparkles,
  founded: Clock3,
  occupation: Medal,
  population: Users,
  timezone: Clock3,
};

const GAME_MODE_OPTIONS: Array<{
  id: GameMode;
  label: string;
  icon: LucideIcon;
  summary: string;
  hint: string;
}> = [
  {
    id: "classic",
    label: "Classic",
    icon: Layers3,
    summary: "Auto clues",
    hint: "Guess, miss, reveal.",
  },
  {
    id: "blurred-lines",
    label: "Blurred",
    icon: ScanSearch,
    summary: "Pick each reveal",
    hint: "Open only what you need.",
  },
];

const pillButtonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0";
const primaryButtonClass = `${pillButtonBase} bg-[#0f766e] text-white shadow-[0_12px_28px_rgba(15,118,110,0.22)] dark:bg-[#24d4c2] dark:text-[#082825]`;
const secondaryButtonClass = `${pillButtonBase} border border-black/8 bg-white/76 text-[#1f1b17] dark:border-white/10 dark:bg-white/6 dark:text-[#f5f7fb]`;
const surfaceClass =
  "rounded-[30px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,251,245,0.96),rgba(255,247,238,0.88))] shadow-[0_24px_60px_rgba(53,36,22,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(13,21,32,0.96),rgba(17,27,40,0.9))] dark:shadow-[0_24px_60px_rgba(0,0,0,0.34)]";

function selectionCardClass(isActive: boolean, isDisabled = false): string {
  return `group grid gap-3 rounded-[26px] border p-4 text-left transition ${
    isDisabled
      ? "cursor-not-allowed border-black/5 bg-[rgba(255,255,255,0.56)] opacity-55 dark:border-white/8 dark:bg-white/6"
      : isActive
        ? "border-[#0f766e] bg-[linear-gradient(160deg,rgba(15,118,110,0.14),rgba(255,255,255,0.94))] shadow-[0_18px_44px_rgba(15,118,110,0.14)] dark:border-[#24d4c2]/60 dark:bg-[linear-gradient(160deg,rgba(36,212,194,0.14),rgba(17,24,39,0.94))] dark:shadow-[0_18px_44px_rgba(0,0,0,0.28)]"
        : "border-black/10 bg-white/86 hover:-translate-y-0.5 hover:border-black/14 dark:border-white/10 dark:bg-[rgba(13,21,32,0.84)] dark:hover:border-white/14"
  }`;
}

function getMenuMessage(category: string | null, mode: GameMode | null): string {
  if (!category) {
    return "Pick a deck.";
  }

  if (!mode) {
    return "Pick a mode.";
  }

  return "Deal a round.";
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
          className="select-none rounded-[0.45rem] bg-black/10 px-1.5 text-[transparent] [text-shadow:0_0_14px_rgba(31,27,23,0.98)] blur-[4.8px] dark:bg-white/14 dark:[text-shadow:0_0_14px_rgba(245,247,251,0.98)]"
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

function renderHiddenCluePlaceholder(clue: Pick<RoundClue, "prefetchedValue">, isLocked: boolean): ReactNode {
  return (
    <span
      aria-hidden="true"
      className={`inline-block align-top text-[1.02rem] leading-7 text-transparent [text-shadow:0_0_14px_rgba(31,27,23,0.98)] blur-[4.8px] select-none dark:[text-shadow:0_0_14px_rgba(245,247,251,0.98)] ${
        isLocked ? "opacity-55" : "opacity-78"
      }`}
    >
      {clue.prefetchedValue}
    </span>
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

function getCategoryMeta(categoryId: string | null): CategoryCardMeta {
  if (categoryId && CATEGORY_META[categoryId]) {
    return CATEGORY_META[categoryId];
  }

  return {
    icon: Sparkles,
    accent: "from-[#0f766e]/16 via-[#f59e0b]/6 to-transparent dark:from-[#24d4c2]/18 dark:via-[#fbbf24]/6",
    shortLabel: "Live deck",
  };
}

function getModeMeta(mode: GameMode | null) {
  return GAME_MODE_OPTIONS.find((entry) => entry.id === mode) ?? GAME_MODE_OPTIONS[0];
}

function getClueIcon(key: string): LucideIcon {
  return CLUE_ICON_MAP[key] ?? Sparkles;
}

function getMessageAppearance(message: string, result: RoundOutcome | null) {
  const lowerMessage = message.toLowerCase();

  if (result?.status === "win" || lowerMessage.includes("correct")) {
    return {
      icon: PartyPopper,
      className:
        "border-emerald-500/18 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/18 dark:bg-emerald-400/10 dark:text-emerald-200",
    };
  }

  if (
    lowerMessage.includes("failed") ||
    lowerMessage.includes("couldn't") ||
    lowerMessage.includes("already") ||
    lowerMessage.includes("pick")
  ) {
    return {
      icon: CircleAlert,
      className:
        "border-amber-500/18 bg-amber-500/10 text-amber-700 dark:border-amber-300/16 dark:bg-amber-300/10 dark:text-amber-200",
    };
  }

  if (lowerMessage.includes("out") || lowerMessage.includes("answer")) {
    return {
      icon: Ban,
      className:
        "border-rose-500/18 bg-rose-500/10 text-rose-700 dark:border-rose-300/18 dark:bg-rose-300/10 dark:text-rose-200",
    };
  }

  return {
    icon: Sparkles,
    className:
      "border-[#0f766e]/14 bg-[#0f766e]/8 text-[#115e59] dark:border-[#24d4c2]/14 dark:bg-[#24d4c2]/8 dark:text-[#8ff4e7]",
  };
}

export function GameShell({ categories, countryOptions }: GameShellProps) {
  const firstPlayableCategory = categories.find((category) => category.entityCount > 0)?.id ?? null;
  const defaultCategory = firstPlayableCategory;
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

  const totalEntityCount = categories.reduce((sum, category) => sum + category.entityCount, 0);
  const totalSelectedEntityCount =
    selectedCategory === "random"
      ? totalEntityCount
      : (categories.find((category) => category.id === selectedCategory)?.entityCount ?? 0);

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
  const selectedCategoryLabel = selectedCategory === "random" ? "Mixed deck" : selectedCategoryMeta?.label ?? "Pick a deck";
  const currentCategory = round?.category ?? result?.category ?? selectedCategory;
  const currentCategoryMeta = categories.find((category) => category.id === currentCategory);
  const currentCategoryLabel = currentCategoryMeta?.label ?? (currentCategory === "random" ? "Mixed deck" : selectedCategoryLabel);
  const currentModeMeta = getModeMeta(currentMode);
  const selectedModeMeta = getModeMeta(selectedMode);
  const canStartRound = Boolean(selectedCategory && selectedMode && totalSelectedEntityCount > 0 && !isPending);
  const revealedCount = currentClues.filter((clue) => clue.isRevealed).length;
  const displayScore = result?.score ?? score ?? 0;
  const statusAppearance = getMessageAppearance(message, result);
  const StatusIcon = statusAppearance.icon;
  const CurrentCategoryIcon = getCategoryMeta(currentCategory).icon;
  const CurrentModeIcon = currentModeMeta.icon;
  const selectedCategoryCardMeta = getCategoryMeta(selectedCategory);
  const SelectedCategoryIcon = selectedCategoryCardMeta.icon;
  const SelectedModeIcon = selectedModeMeta.icon;
  const isBusy = isPending || isSyncingReveal;
  const guessButtonLabel = isBusy ? "..." : round?.canGuess ? "Guess" : currentMode === "blurred-lines" ? "Reveal" : "Locked";
  const validationMessage = isCountryRound && hasGuess && !isCountryGuessValid ? "Pick a listed country." : isAlreadyGuessed ? "Already tried." : null;

  function handleCategorySelect(categoryId: string) {
    if (categoryId === "random") {
      if (totalEntityCount === 0) {
        setMessage("Deck not ready.");
        return;
      }

      setSelectedCategory(categoryId);
      setMessage(getMenuMessage(categoryId, selectedMode));
      return;
    }

    const category = categories.find((entry) => entry.id === categoryId);

    if (!category || category.entityCount === 0) {
      setMessage("Deck not ready.");
      return;
    }

    setSelectedCategory(categoryId);
    setMessage(getMenuMessage(categoryId, selectedMode));
  }

  function handleModeSelect(mode: GameMode) {
    if (!selectedCategory) {
      setMessage("Pick a deck first.");
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
      setMessage(round.mode === "blurred-lines" ? "Reveal a row." : "Wait for the next clue.");
      return;
    }

    if (isAlreadyGuessed) {
      setMessage("Already tried.");
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
        data.mode === "blurred-lines" ? "Miss. Pick another row." : data.remainingClues === 0 ? "Miss. Last chance." : "Miss. Next clue.",
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
      <div className="grid min-h-[calc(100dvh-1rem)] gap-4 sm:min-h-[calc(100dvh-1.5rem)] sm:gap-5">
        <header className={`${surfaceClass} overflow-hidden p-5 sm:p-7`}>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0f766e]/12 bg-[#0f766e]/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:border-[#24d4c2]/14 dark:bg-[#24d4c2]/8 dark:text-[#8ff4e7]">
              <Sparkles aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
              Fast rounds
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/76 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:border-white/10 dark:bg-white/6 dark:text-[#9aa9bb]">
              <Shuffle aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
              {totalEntityCount} answers live
            </span>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
            <div>
              <h1 className="m-0 max-w-[8ch] font-serif-display text-[clamp(2.6rem,9vw,4.8rem)] font-semibold leading-[0.9] tracking-[-0.065em] text-[#1f1b17] dark:text-[#f5f7fb]">
                WikiGuesser
              </h1>
              <p className="m-0 mt-4 max-w-xl text-[1.02rem] leading-7 text-[#6b6259] dark:text-[#9aa9bb]">Read the clues. Beat the reveal.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[26px] border border-black/8 bg-white/78 p-4 dark:border-white/10 dark:bg-white/6">
                <div className={`mb-3 inline-flex rounded-2xl bg-gradient-to-br p-2.5 ${selectedCategoryCardMeta.accent}`}>
                  <SelectedCategoryIcon aria-hidden="true" className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
                </div>
                <p className="m-0 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">Deck</p>
                <strong className="mt-2 block font-serif-display text-[1.45rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                  {selectedCategoryLabel}
                </strong>
                <span className="mt-1 block text-sm text-[#6b6259] dark:text-[#9aa9bb]">{selectedCategoryCardMeta.shortLabel}</span>
              </div>

              <div className="rounded-[26px] border border-black/8 bg-white/78 p-4 dark:border-white/10 dark:bg-white/6">
                <div className="mb-3 inline-flex rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.16),rgba(255,219,112,0.12))] p-2.5 dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))]">
                  <SelectedModeIcon aria-hidden="true" className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
                </div>
                <p className="m-0 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">Mode</p>
                <strong className="mt-2 block font-serif-display text-[1.45rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                  {selectedModeMeta.label}
                </strong>
                <span className="mt-1 block text-sm text-[#6b6259] dark:text-[#9aa9bb]">{selectedModeMeta.summary}</span>
              </div>
            </div>
          </div>
        </header>

        <section className={`${surfaceClass} p-5 sm:p-6`}>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_320px]">
            <div className="grid gap-5">
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
                    <Compass aria-hidden="true" className="size-4" strokeWidth={2.2} />
                    Decks
                  </div>
                  <span className="rounded-full bg-white/76 px-3 py-1 text-xs font-semibold text-[#6b6259] dark:bg-white/6 dark:text-[#9aa9bb]">
                    {categories.length + (showRandomMix ? 1 : 0)} picks
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {showRandomMix ? (
                    <button className={selectionCardClass(selectedCategory === "random")} onClick={() => handleCategorySelect("random")} type="button">
                      <div className="flex items-start justify-between gap-3">
                        <span className={`inline-flex rounded-2xl bg-gradient-to-br p-2.5 ${CATEGORY_META.random.accent}`}>
                          <Shuffle aria-hidden="true" className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
                        </span>
                        <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-semibold text-[#6b6259] dark:bg-white/8 dark:text-[#9aa9bb]">
                          {totalEntityCount}
                        </span>
                      </div>
                      <strong className="font-serif-display text-[1.55rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">Mixed deck</strong>
                      <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">Random across every live deck.</span>
                    </button>
                  ) : null}

                  {categories.map((category) => {
                    const categoryMeta = getCategoryMeta(category.id);
                    const CategoryIcon = categoryMeta.icon;

                    return (
                      <button
                        className={selectionCardClass(selectedCategory === category.id, category.entityCount === 0)}
                        disabled={category.entityCount === 0}
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className={`inline-flex rounded-2xl bg-gradient-to-br p-2.5 ${categoryMeta.accent}`}>
                            <CategoryIcon aria-hidden="true" className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
                          </span>
                          <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-semibold text-[#6b6259] dark:bg-white/8 dark:text-[#9aa9bb]">
                            {category.entityCount > 0 ? category.entityCount : "Soon"}
                          </span>
                        </div>
                        <strong className="font-serif-display text-[1.55rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">{category.label}</strong>
                        <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">{categoryMeta.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
                  <Sparkles aria-hidden="true" className="size-4" strokeWidth={2.2} />
                  Modes
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {GAME_MODE_OPTIONS.map((mode) => {
                    const isDisabled = !selectedCategory || totalSelectedEntityCount === 0;
                    const ModeIcon = mode.icon;

                    return (
                      <button
                        className={selectionCardClass(selectedMode === mode.id, isDisabled)}
                        disabled={isDisabled}
                        key={mode.id}
                        onClick={() => handleModeSelect(mode.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="inline-flex rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.12))] p-2.5 dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))]">
                            <ModeIcon aria-hidden="true" className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
                          </span>
                          <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-semibold text-[#6b6259] dark:bg-white/8 dark:text-[#9aa9bb]">
                            {mode.summary}
                          </span>
                        </div>
                        <strong className="font-serif-display text-[1.55rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">{mode.label}</strong>
                        <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">{mode.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="grid content-start gap-4 rounded-[28px] border border-black/8 bg-white/78 p-4 dark:border-white/10 dark:bg-[rgba(255,255,255,0.05)]">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium ${statusAppearance.className}`}>
                <StatusIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.2} />
                <span>{message}</span>
              </div>

              <div className="grid gap-3 rounded-[24px] border border-black/8 bg-[rgba(15,118,110,0.04)] p-4 dark:border-white/10 dark:bg-[rgba(36,212,194,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">Ready</span>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#115e59] dark:bg-white/8 dark:text-[#8ff4e7]">
                    {totalSelectedEntityCount}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex rounded-2xl bg-gradient-to-br p-2.5 ${selectedCategoryCardMeta.accent}`}>
                    <SelectedCategoryIcon aria-hidden="true" className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 text-xs uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]">Deck</p>
                    <strong className="block truncate text-[#1f1b17] dark:text-[#f5f7fb]">{selectedCategoryLabel}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="inline-flex rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.12))] p-2.5 dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))]">
                    <SelectedModeIcon aria-hidden="true" className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 text-xs uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]">Mode</p>
                    <strong className="block truncate text-[#1f1b17] dark:text-[#f5f7fb]">{selectedModeMeta.label}</strong>
                  </div>
                </div>
              </div>

              <button className={`${primaryButtonClass} w-full`} disabled={!canStartRound} onClick={startRound} type="button">
                <Play aria-hidden="true" className="size-4.5" strokeWidth={2.3} />
                Deal round
              </button>
            </aside>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100dvh-1rem)] gap-4 sm:min-h-[calc(100dvh-1.5rem)] sm:gap-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0f766e]/12 bg-[#0f766e]/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:border-[#24d4c2]/14 dark:bg-[#24d4c2]/8 dark:text-[#8ff4e7]">
            {result?.status === "win" ? (
              <PartyPopper aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
            ) : (
              <Play aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
            )}
            {view === "round" ? "Round live" : result?.status === "win" ? "Solved" : "Answer shown"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/78 px-3 py-1.5 text-sm font-medium text-[#115e59] dark:bg-white/6 dark:text-[#8ff4e7]">
            <CurrentCategoryIcon aria-hidden="true" className="size-4" strokeWidth={2.2} />
            {currentCategoryLabel}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/78 px-3 py-1.5 text-sm font-medium text-[#115e59] dark:bg-white/6 dark:text-[#8ff4e7]">
            <CurrentModeIcon aria-hidden="true" className="size-4" strokeWidth={2.2} />
            {currentModeMeta.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:w-auto">
          <div className="rounded-[20px] border border-black/8 bg-white/78 px-3 py-2 dark:border-white/10 dark:bg-white/6">
            <span className="block text-[0.7rem] uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]">Score</span>
            <strong className="text-[1.2rem] text-[#1f1b17] dark:text-[#f5f7fb]">{displayScore}</strong>
          </div>
          <div className="rounded-[20px] border border-black/8 bg-white/78 px-3 py-2 dark:border-white/10 dark:bg-white/6">
            <span className="block text-[0.7rem] uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]">Left</span>
            <strong className="text-[1.2rem] text-[#1f1b17] dark:text-[#f5f7fb]">{round?.remainingClues ?? 0}</strong>
          </div>
          <div className="rounded-[20px] border border-black/8 bg-white/78 px-3 py-2 dark:border-white/10 dark:bg-white/6">
            <span className="block text-[0.7rem] uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]">Tried</span>
            <strong className="text-[1.2rem] text-[#1f1b17] dark:text-[#f5f7fb]">{guessedEntities.length}</strong>
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_340px]">
        <section className={`${surfaceClass} grid content-start gap-4 p-4 sm:p-5`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="m-0 font-serif-display text-[clamp(1.95rem,6vw,3.2rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-[#1f1b17] dark:text-[#f5f7fb]">
                {currentMode === "blurred-lines" ? "Open the dossier" : "Read the trail"}
              </h1>
              <p className="m-0 mt-2 text-sm text-[#6b6259] dark:text-[#9aa9bb]">
                {currentMode === "blurred-lines" ? "Reveal only what you need." : "Each miss burns another clue."}
              </p>
            </div>

            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium ${statusAppearance.className}`}>
              <StatusIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.2} />
              <span>{message}</span>
            </div>
          </div>

          <div className="grid gap-2 rounded-[24px] border border-black/8 bg-white/72 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
              <span>Reveal meter</span>
              <span>
                {revealedCount}/{currentClues.length || 0}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {currentClues.map((clue) => (
                <span
                  className={`h-2 rounded-full ${
                    clue.isRevealed
                      ? "bg-[#0f766e] dark:bg-[#24d4c2]"
                      : clue.spoilerLevel === "late"
                        ? "bg-[#d6d3d1] dark:bg-white/14"
                        : "bg-[#ebe4d7] dark:bg-white/8"
                  }`}
                  key={clue.key}
                />
              ))}
            </div>
          </div>

          {currentMode === "blurred-lines" ? (
            <div className="overflow-hidden rounded-[28px] border border-[#a2a9b1] bg-[#f8f9fa] shadow-[0_18px_38px_rgba(60,64,67,0.08)] dark:border-white/10 dark:bg-[#111a27] dark:shadow-[0_18px_38px_rgba(0,0,0,0.34)]">
              <table className="w-full border-collapse text-left text-sm text-[#202122] dark:text-[#edf3fa]">
                <thead>
                  <tr className="bg-white text-xs uppercase tracking-[0.16em] text-[#54595d] dark:bg-[#101926] dark:text-[#99a9bc]">
                    <th className="w-[38%] border-b border-r border-[#c8ccd1] px-4 py-3 font-semibold dark:border-white/10">Field</th>
                    <th className="border-b border-[#c8ccd1] px-4 py-3 font-semibold dark:border-white/10">Reveal</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClues.map((clue, index) => {
                    const isLocked = Boolean(round) && isClueLocked(currentClues, clue);
                    const ClueIcon = getClueIcon(clue.key);

                    return (
                      <tr
                        className={`${index % 2 === 0 ? "bg-white dark:bg-[#121c2a]" : "bg-[#f8f9fa] dark:bg-[#162231]"} ${isLocked ? "opacity-60" : ""}`}
                        key={clue.key}
                      >
                        <th className="border-r border-t border-[#c8ccd1] px-4 py-3 align-top font-semibold text-[#202122] dark:border-white/10 dark:text-[#edf3fa]">
                          <span className="inline-flex items-center gap-2">
                            <ClueIcon aria-hidden="true" className="size-4" strokeWidth={2.1} />
                            <span>{clue.label}</span>
                          </span>
                        </th>
                        <td className="border-t border-[#c8ccd1] px-4 py-3 align-top dark:border-white/10">
                          {clue.isRevealed ? (
                            <div className="flex w-full items-start justify-between gap-3">
                              <span className="min-w-0 text-[1.02rem] leading-7 text-[#202122] dark:text-[#edf3fa]">{renderClueValue(clue)}</span>
                              <span
                                aria-hidden="true"
                                className="pointer-events-none inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] opacity-0 select-none"
                              >
                                <Eye aria-hidden="true" className="size-3" strokeWidth={2.2} />
                                Reveal
                              </span>
                            </div>
                          ) : round ? (
                            isLocked ? (
                              <div className="flex w-full items-start justify-between gap-3">
                                <span className="min-w-0">{renderHiddenCluePlaceholder(clue, true)}</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(248,250,252,0.88)] px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#54595d] dark:bg-[rgba(15,23,36,0.88)] dark:text-[#99a9bc]">
                                  <Lock aria-hidden="true" className="size-3" strokeWidth={2.2} />
                                  Later
                                </span>
                              </div>
                            ) : (
                              <div className="flex w-full items-start justify-between gap-3">
                                <button
                                  aria-label={`Reveal ${clue.label}`}
                                  className="min-w-0 bg-transparent p-0 text-left transition duration-150 hover:-translate-y-0.5 hover:opacity-100"
                                  disabled={isBusy}
                                  onClick={() => revealClue(clue.key)}
                                  type="button"
                                >
                                  {renderHiddenCluePlaceholder(clue, false)}
                                </button>
                                <button
                                  aria-label={`Reveal ${clue.label}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-[rgba(248,250,252,0.88)] px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#54595d] transition duration-150 hover:-translate-y-0.5 hover:bg-white dark:bg-[rgba(15,23,36,0.88)] dark:text-[#c7d3e2] dark:hover:bg-[rgba(30,41,59,0.96)]"
                                  disabled={isBusy}
                                  onClick={() => revealClue(clue.key)}
                                  type="button"
                                >
                                  <Eye aria-hidden="true" className="size-3" strokeWidth={2.2} />
                                  Reveal
                                </button>
                              </div>
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
              {visibleClassicClues.map((clue, index) => {
                const ClueIcon = getClueIcon(clue.key);

                return (
                  <li
                    className={`rounded-[28px] border p-4 ${
                      index === visibleClassicClues.length - 1 && round
                        ? "border-[#0f766e]/16 bg-[linear-gradient(160deg,rgba(15,118,110,0.12),rgba(255,255,255,0.92))] dark:border-[#24d4c2]/18 dark:bg-[linear-gradient(160deg,rgba(36,212,194,0.12),rgba(17,24,39,0.92))]"
                        : "border-black/8 bg-white/84 dark:border-white/10 dark:bg-[rgba(255,255,255,0.05)]"
                    }`}
                    key={clue.key}
                  >
                    <div className="flex items-start gap-4">
                      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.12))] text-[#1f1b17] dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))] dark:text-[#f5f7fb]">
                        <ClueIcon aria-hidden="true" className="size-5" strokeWidth={2.1} />
                      </span>
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
                          <span className="inline-flex size-5 items-center justify-center rounded-full bg-black/5 text-[0.65rem] dark:bg-white/8">
                            {index + 1}
                          </span>
                          {clue.label}
                        </div>
                        <strong className="mt-2 block text-[clamp(1.28rem,4vw,1.82rem)] leading-[1.08] text-[#1f1b17] dark:text-[#f5f7fb]">
                          {renderClueValue(clue)}
                        </strong>
                      </div>
                    </div>
                  </li>
                );
              })}

              {visibleClassicClues.length === 0 ? (
                <li className="grid min-h-48 place-items-center rounded-[28px] border border-dashed border-black/10 bg-white/78 p-6 text-center dark:border-white/12 dark:bg-[rgba(255,255,255,0.05)]">
                  <div className="grid gap-3">
                    <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.12))] dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))]">
                      <Sparkles aria-hidden="true" className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
                    </span>
                    <strong className="font-serif-display text-[1.5rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">First clue coming up</strong>
                  </div>
                </li>
              ) : null}
            </ol>
          )}
        </section>

        <aside className="grid content-start gap-4">
          {round ? (
            <div className={`${surfaceClass} grid gap-4 p-4`}>
              <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
                <Target aria-hidden="true" className="size-4" strokeWidth={2.2} />
                Guess
              </div>

              <form className="grid gap-3" onSubmit={handleGuessSubmit}>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#6b6259] dark:text-[#9aa9bb]"
                    strokeWidth={2.2}
                  />
                  <input
                    aria-label="Submit your entity guess"
                    className="w-full rounded-[20px] border border-black/10 bg-white/86 px-12 py-4 text-[#1f1b17] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[rgba(15,118,110,0.22)] dark:border-white/10 dark:bg-[rgba(255,255,255,0.06)] dark:text-[#f5f7fb] dark:focus:border-[#24d4c2] dark:focus:ring-[rgba(36,212,194,0.22)]"
                    list={isCountryRound ? "country-guess-options" : undefined}
                    disabled={isBusy}
                    onChange={(event) => setGuess(event.target.value)}
                    placeholder={isCountryRound ? "Search country" : "Type answer"}
                    type="text"
                    value={guess}
                  />
                </div>

                {validationMessage ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/18 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700 dark:border-amber-300/16 dark:bg-amber-300/10 dark:text-amber-200">
                    <CircleAlert aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.2} />
                    {validationMessage}
                  </div>
                ) : !round.canGuess ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/76 px-3 py-2 text-sm font-medium text-[#6b6259] dark:border-white/10 dark:bg-white/6 dark:text-[#9aa9bb]">
                    {round.mode === "blurred-lines" ? (
                      <Eye aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.2} />
                    ) : (
                      <Lock aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.2} />
                    )}
                    {round.mode === "blurred-lines" ? "Reveal a row." : "Next miss reveals more."}
                  </div>
                ) : null}

                <button className={`${primaryButtonClass} w-full`} disabled={!canSubmitGuess} type="submit">
                  {isBusy ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" strokeWidth={2.2} />
                  ) : (
                    <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2.3} />
                  )}
                  {guessButtonLabel}
                </button>
              </form>

              {guessedEntities.length > 0 ? (
                <div className="grid gap-2">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">Tried</div>
                  <div className="flex flex-wrap gap-2">
                    {guessedEntities.map((entity) => (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(220,38,38,0.14)] bg-[rgba(254,242,242,0.95)] px-3 py-1 text-xs font-medium text-[#991b1b] dark:border-[rgba(248,113,113,0.2)] dark:bg-[rgba(127,29,29,0.18)] dark:text-[#fca5a5]"
                        key={entity}
                      >
                        <X aria-hidden="true" className="size-3.5 shrink-0 text-[#dc2626] dark:text-[#f87171]" strokeWidth={2.25} />
                        <span>{entity}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {isCountryRound ? (
            <datalist id="country-guess-options">
              {availableCountryOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          ) : null}

          <div className={`${surfaceClass} grid gap-3 p-4`}>
            <button className={`${secondaryButtonClass} w-full`} disabled={isBusy} onClick={startRound} type="button">
              <RotateCcw aria-hidden="true" className="size-4" strokeWidth={2.2} />
              New round
            </button>
            <button className={`${secondaryButtonClass} w-full`} disabled={isBusy} onClick={clearForCategoryChoice} type="button">
              <House aria-hidden="true" className="size-4" strokeWidth={2.2} />
              Decks
            </button>
          </div>
        </aside>
      </div>

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
              className="w-full max-w-md rounded-[32px] border border-[rgba(17,94,89,0.14)] bg-[linear-gradient(180deg,rgba(255,251,245,0.98),rgba(255,247,238,0.95))] p-6 shadow-[0_30px_80px_rgba(29,22,14,0.26)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,22,34,0.98),rgba(19,29,43,0.95))] dark:shadow-[0_30px_80px_rgba(0,0,0,0.46)] sm:p-7"
              role="dialog"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`inline-flex size-14 shrink-0 items-center justify-center rounded-[22px] ${
                    result.status === "win"
                      ? "bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.18))] dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.14))]"
                      : "bg-[linear-gradient(135deg,rgba(220,38,38,0.14),rgba(251,191,36,0.12))] dark:bg-[linear-gradient(135deg,rgba(248,113,113,0.18),rgba(251,191,36,0.1))]"
                  }`}
                >
                  {result.status === "win" ? (
                    <PartyPopper aria-hidden="true" className="size-6 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
                  ) : (
                    <Ban aria-hidden="true" className="size-6 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
                  )}
                </span>

                <div className="min-w-0">
                  <p className="m-0 text-[0.74rem] font-semibold uppercase tracking-[0.2em] text-[#115e59] dark:text-[#75e6d7]">
                    {result.status === "win" ? "Solved" : "Missed"}
                  </p>
                  <h2
                    className="m-0 mt-2 font-serif-display text-[clamp(2rem,8vw,3.1rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-[#1f1b17] dark:text-[#f5f7fb]"
                    id="round-result-title"
                  >
                    {result.canonicalAnswer}
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-[22px] border border-black/8 bg-white/78 p-4 dark:border-white/10 dark:bg-white/6">
                  <Trophy aria-hidden="true" className="size-5 text-[#115e59] dark:text-[#8ff4e7]" strokeWidth={2.1} />
                  <div>
                    <span className="block text-[0.72rem] uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]">Score</span>
                    <strong className="text-[#1f1b17] dark:text-[#f5f7fb]">{result.score} pts</strong>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-[22px] border border-black/8 bg-white/78 p-4 dark:border-white/10 dark:bg-white/6">
                  <CurrentCategoryIcon aria-hidden="true" className="size-5 text-[#115e59] dark:text-[#8ff4e7]" strokeWidth={2.1} />
                  <div>
                    <span className="block text-[0.72rem] uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]">Deck</span>
                    <strong className="text-[#1f1b17] dark:text-[#f5f7fb]">{currentCategoryLabel}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button className={`${primaryButtonClass} flex-1`} disabled={isBusy} onClick={startRound} type="button">
                  <RotateCcw aria-hidden="true" className="size-4" strokeWidth={2.2} />
                  Play again
                </button>
                <button className={`${secondaryButtonClass} flex-1`} disabled={isBusy} onClick={clearForCategoryChoice} type="button">
                  <House aria-hidden="true" className="size-4" strokeWidth={2.2} />
                  Decks
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
