"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  Compass,
  LoaderCircle,
  Shuffle,
  Sparkles,
  Trophy,
} from "lucide-react";

import {
  GAME_MODE_OPTIONS,
  CATEGORY_META,
  primaryButtonClass,
  surfaceClass,
} from "@/src/components/game-shell/config";
import { GamePlayView } from "@/src/components/game-shell/play-view";
import { GameResultDialog } from "@/src/components/game-shell/result-dialog";
import type { ActiveRound, RoundOutcome } from "@/src/components/game-shell/types";
import { useViewportSize } from "@/src/components/game-shell/use-viewport-size";
import {
  getCategoryMeta,
  getMenuMessage,
  getMessageAppearance,
  getModeMeta,
  isClueLocked,
  selectionCardClass,
  toPlayableClues,
} from "@/src/components/game-shell/utils";
import { normalizeGuess } from "@/src/lib/game/answer-matching";
import { getDailyComboKey } from "@/src/lib/game/daily";
import type {
  CategorySummary,
  DailyChallengeOption,
  DailyLandingData,
  GameMode,
  GuessRoundResult,
  RevealClueResult,
  StartRoundResult,
} from "@/src/lib/types";

interface SharedLandingShellProps {
  categories: CategorySummary[];
  countryOptions: string[];
  dailyData: DailyLandingData;
  hasPendingClaim: boolean;
  isSignedIn: boolean;
}

type PlayType = "daily" | "free-play";

interface PlayedOverride {
  score: number;
  completedAt: string;
}

function getTimeUntilBudapestMidnight() {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Budapest",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  const hours = Number(values.hour ?? "0");
  const minutes = Number(values.minute ?? "0");

  return `${String(23 - hours).padStart(2, "0")}:${String(59 - minutes).padStart(2, "0")}`;
}

function toCategoryLabel(category: string | null, categories: CategorySummary[]) {
  if (category === "random") {
    return "Mixed category";
  }

  return (
    categories.find((entry) => entry.id === category)?.label ?? "Pick a category"
  );
}

function getSelectionMessage(params: {
  playType: PlayType;
  selectedCategory: string | null;
  selectedMode: GameMode | null;
  selectedDailyOption: DailyChallengeOption | null;
  isClaimingPending: boolean;
}) {
  if (params.playType === "free-play") {
    return getMenuMessage(params.selectedCategory, params.selectedMode);
  }

  if (params.isClaimingPending) {
    return "Syncing claimed scores.";
  }

  if (!params.selectedCategory) {
    return "Pick a category.";
  }

  if (!params.selectedMode) {
    return "Pick a mode.";
  }

  if (!params.selectedDailyOption) {
    return "Daily challenge unavailable.";
  }

  if (params.selectedDailyOption.playerStatus.hasPlayed) {
    return "Already played today.";
  }

  return "Start today's daily.";
}

function getMissMessage(data: GuessRoundResult) {
  if (data.mode === "blurred-lines") {
    return "Miss. Pick another row.";
  }

  if (data.remainingClues === 0) {
    return "Miss. Last chance.";
  }

  return "Miss. Next clue.";
}

export function SharedLandingShell({
  categories,
  countryOptions,
  dailyData,
  hasPendingClaim,
  isSignedIn,
}: SharedLandingShellProps) {
  const router = useRouter();
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const defaultFreePlayCategory =
    categories.find((category) => category.entityCount > 0)?.id ?? null;
  const [selectedPlayType, setSelectedPlayType] = useState<PlayType>("daily");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    dailyData.defaultCategory,
  );
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(
    dailyData.defaultMode,
  );
  const [round, setRound] = useState<ActiveRound | null>(null);
  const [result, setResult] = useState<RoundOutcome | null>(null);
  const [guess, setGuess] = useState("");
  const [guessedEntities, setGuessedEntities] = useState<string[]>([]);
  const [message, setMessage] = useState("Start today's daily.");
  const [score, setScore] = useState<number | null>(null);
  const [isSyncingReveal, setIsSyncingReveal] = useState(false);
  const [claimBanner, setClaimBanner] = useState<string | null>(null);
  const [isClaimingPending, setIsClaimingPending] = useState(
    isSignedIn && hasPendingClaim,
  );
  const [resetCountdown, setResetCountdown] = useState("00:00");
  const [playedOverrides, setPlayedOverrides] = useState<
    Record<string, PlayedOverride>
  >({});
  const [isPending, startTransition] = useTransition();

  const validCountryLookup = useMemo(
    () =>
      new Map(countryOptions.map((option) => [normalizeGuess(option), option])),
    [countryOptions],
  );

  const dailyOptions = useMemo(
    () =>
      dailyData.options.map((option) => {
        const override =
          playedOverrides[getDailyComboKey(option.category, option.mode)];

        return override
          ? {
              ...option,
              playerStatus: {
                hasPlayed: true,
                score: override.score,
                completedAt: override.completedAt,
              },
            }
          : option;
      }),
    [dailyData.options, playedOverrides],
  );

  const selectedDailyOption =
    dailyOptions.find(
      (option) =>
        option.category === selectedCategory && option.mode === selectedMode,
    ) ?? null;
  const selectedCategoryDailyOptions =
    selectedPlayType === "daily" && selectedCategory
      ? dailyOptions.filter((option) => option.category === selectedCategory)
      : [];
  const view = round ? "round" : result ? "result" : "menu";
  const totalEntityCount = categories.reduce(
    (sum, category) => sum + category.entityCount,
    0,
  );
  const totalSelectedEntityCount =
    selectedCategory === "random"
      ? totalEntityCount
      : (categories.find((category) => category.id === selectedCategory)
          ?.entityCount ?? 0);
  const showRandomMix = selectedPlayType === "free-play" && categories.length > 1;
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
  const currentCategory = round?.category ?? result?.category ?? selectedCategory;
  const currentCategoryLabel = toCategoryLabel(currentCategory, categories);
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
  const canStartSelection =
    selectedPlayType === "daily"
      ? Boolean(
          selectedDailyOption &&
            !selectedDailyOption.playerStatus.hasPlayed &&
            !isClaimingPending &&
            !isPending,
        )
      : Boolean(
          selectedCategory &&
          selectedMode &&
          totalSelectedEntityCount > 0 &&
          !isPending,
        );
  const selectedModeMeta = getModeMeta(selectedMode);
  const selectedDailyScore =
    selectedDailyOption?.playerStatus.score ?? null;
  const StatusIcon = statusAppearance.icon;

  useEffect(() => {
    if (selectedPlayType === "daily" && selectedCategory === "random") {
      setSelectedCategory(dailyData.defaultCategory);
      return;
    }

    if (!selectedCategory) {
      setSelectedCategory(
        selectedPlayType === "daily"
          ? dailyData.defaultCategory
          : defaultFreePlayCategory,
      );
    }
  }, [
    defaultFreePlayCategory,
    dailyData.defaultCategory,
    selectedCategory,
    selectedPlayType,
  ]);

  useEffect(() => {
    if (selectedPlayType === "daily" && !selectedMode) {
      setSelectedMode(dailyData.defaultMode);
    }
  }, [dailyData.defaultMode, selectedMode, selectedPlayType]);

  useEffect(() => {
    if (
      selectedPlayType !== "daily" ||
      !selectedCategory ||
      !selectedMode ||
      view !== "menu"
    ) {
      return;
    }

    const currentOption = dailyOptions.find(
      (option) =>
        option.category === selectedCategory && option.mode === selectedMode,
    );

    if (!currentOption?.playerStatus.hasPlayed) {
      return;
    }

    const nextAvailableOption = dailyOptions.find(
      (option) =>
        option.category === selectedCategory && !option.playerStatus.hasPlayed,
    );

    if (nextAvailableOption && nextAvailableOption.mode !== selectedMode) {
      setSelectedMode(nextAvailableOption.mode);
    }
  }, [dailyOptions, selectedCategory, selectedMode, selectedPlayType, view]);

  useEffect(() => {
    if (view !== "menu") {
      return;
    }

    setMessage(
      getSelectionMessage({
        playType: selectedPlayType,
        selectedCategory,
        selectedMode,
        selectedDailyOption,
        isClaimingPending,
      }),
    );
  }, [
    isClaimingPending,
    selectedCategory,
    selectedDailyOption,
    selectedMode,
    selectedPlayType,
    view,
  ]);

  useEffect(() => {
    setResetCountdown(getTimeUntilBudapestMidnight());

    const intervalId = window.setInterval(() => {
      setResetCountdown(getTimeUntilBudapestMidnight());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!isSignedIn || !hasPendingClaim) {
      setIsClaimingPending(false);
      return;
    }

    let isActive = true;

    startTransition(async () => {
      try {
        const response = await fetch("/api/daily/claim-pending", {
          method: "POST",
        });

        if (!response.ok || !isActive) {
          return;
        }

        const payload = (await response.json()) as {
          claimedCount: number;
          message: string | null;
        };

        if (!isActive) {
          return;
        }

        if (payload.message) {
          setClaimBanner(payload.message);
        }

        if (payload.claimedCount > 0) {
          router.refresh();
        }
      } finally {
        if (isActive) {
          setIsClaimingPending(false);
        }
      }
    });

    return () => {
      isActive = false;
    };
  }, [hasPendingClaim, isSignedIn, router]);

  function clearToHome(options?: { refresh?: boolean }) {
    setRound(null);
    setResult(null);
    setGuess("");
    setGuessedEntities([]);
    setScore(null);
    setIsSyncingReveal(false);

    if (options?.refresh) {
      router.refresh();
    }
  }

  function startFreePlay() {
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

      const payload = (await response.json()) as StartRoundResult;
      setRound(payload);
      setMessage(
        payload.mode === "blurred-lines" ? "Tap a row." : "Round live.",
      );
    });
  }

  function startDaily(option: DailyChallengeOption | null = selectedDailyOption) {
    if (!option) {
      setMessage("Daily challenge unavailable.");
      return;
    }

    if (option.playerStatus.hasPlayed) {
      setMessage("Already played today.");
      return;
    }

    setSelectedPlayType("daily");
    setSelectedCategory(option.category);
    setSelectedMode(option.mode);
    setGuess("");
    setGuessedEntities([]);
    setScore(null);
    setResult(null);
    setIsSyncingReveal(false);

    startTransition(async () => {
      let response: Response;

      try {
        response = await fetch("/api/daily/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category: option.category,
            mode: option.mode,
          }),
        });
      } catch {
        setMessage("Daily failed. Retry.");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setMessage(payload?.error ?? "Daily failed.");
        return;
      }

      const payload = (await response.json()) as StartRoundResult;
      setRound(payload);
      setMessage(payload.mode === "blurred-lines" ? "Tap a row." : "Daily live.");
    });
  }

  function startSelectedFlow() {
    if (selectedPlayType === "daily") {
      void startDaily(selectedDailyOption);
      return;
    }

    void startFreePlay();
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

        const payload = (await response.json()) as RevealClueResult;
        setRound(payload);
        setMessage(
          payload.remainingClues === 0 ? "Last clue." : "Clue unlocked.",
        );
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
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setMessage(payload?.error ?? "Guess failed.");
        return;
      }

      const payload = (await response.json()) as GuessRoundResult;
      setGuessedEntities((current) => [...current, submittedGuess]);
      setScore(payload.score || null);
      setGuess("");

      if (payload.isCorrect) {
        setRound(null);
        setResult({
          status: "win",
          canonicalAnswer: payload.canonicalAnswer ?? "Unknown",
          score: payload.score,
          kind: payload.kind,
          category: payload.category,
          mode: payload.mode,
          clues: payload.clues,
        });

        if (payload.kind === "daily") {
          setPlayedOverrides((current) => ({
            ...current,
            [getDailyComboKey(payload.category, payload.mode)]: {
              score: payload.score,
              completedAt: new Date().toISOString(),
            },
          }));
        }

        setMessage("Correct.");
        return;
      }

      if (payload.isComplete) {
        setRound(null);
        setResult({
          status: "loss",
          canonicalAnswer: payload.canonicalAnswer ?? "Unknown",
          score: 0,
          kind: payload.kind,
          category: payload.category,
          mode: payload.mode,
          clues: payload.clues,
        });

        if (payload.kind === "daily") {
          setPlayedOverrides((current) => ({
            ...current,
            [getDailyComboKey(payload.category, payload.mode)]: {
              score: payload.score,
              completedAt: new Date().toISOString(),
            },
          }));
        }

        setMessage(`Answer: ${payload.canonicalAnswer ?? "Unknown"}.`);
        return;
      }

      setRound({
        roundId: payload.roundId,
        token: payload.token!,
        kind: payload.kind,
        category: payload.category,
        mode: payload.mode,
        clues: payload.clues,
        revealedClues: payload.revealedClues,
        remainingClues: payload.remainingClues,
        canGuess: payload.canGuess,
      });
      setMessage(getMissMessage(payload));
    });
  }

  function handleGuessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitGuess();
  }

  function giveUpRound() {
    if (!round) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/rounds/${round.roundId}/give-up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: round.token,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setMessage(payload?.error ?? "Give up failed.");
        return;
      }

      const payload = (await response.json()) as GuessRoundResult;
      setRound(null);
      setResult({
        status: "loss",
        canonicalAnswer: payload.canonicalAnswer ?? "Unknown",
        score: 0,
        kind: payload.kind,
        category: payload.category,
        mode: payload.mode,
        clues: payload.clues,
        showDialog: false,
      });
      setGuess("");

      if (payload.kind === "daily") {
        setPlayedOverrides((current) => ({
          ...current,
          [getDailyComboKey(payload.category, payload.mode)]: {
            score: payload.score,
            completedAt: new Date().toISOString(),
          },
        }));
      }

      setMessage(`Answer: ${payload.canonicalAnswer ?? "Unknown"}.`);
    });
  }

  if (view !== "menu") {
    const activeKind =
      round?.kind ??
      result?.kind ??
      (selectedPlayType === "daily" ? "daily" : "standard");
    const isDailyFlow = activeKind === "daily";

    return (
      <>
        <GamePlayView
          availableCountryOptions={availableCountryOptions}
          canSubmitGuess={canSubmitGuess}
          clearForCategoryChoice={() => clearToHome()}
          currentCategory={currentCategory}
          currentCategoryLabel={currentCategoryLabel}
          currentClues={currentClues}
          currentMode={currentMode}
          displayScore={displayScore}
          giveUpRound={giveUpRound}
          flowLabel={isDailyFlow ? "Daily" : "Free play"}
          guess={guess}
          guessedEntities={guessedEntities}
          guessButtonLabel={guessButtonLabel}
          handleGuessSubmit={handleGuessSubmit}
          homeButtonLabel="Home"
          isBusy={isBusy}
          isCountryRound={isCountryRound}
          message={message}
          result={result}
          revealClue={revealClue}
          revealedCount={revealedCount}
          round={round}
          setGuess={setGuess}
          showRestartButton={!isDailyFlow}
          startRound={startSelectedFlow}
          statusAppearance={statusAppearance}
          validationMessage={validationMessage}
          view={view === "result" ? "result" : "round"}
          visibleClassicClues={visibleClassicClues}
        />

        {result?.status === "win" && viewportWidth > 0 && viewportHeight > 0 ? (
          <Confetti
            gravity={0.16}
            height={viewportHeight}
            numberOfPieces={320}
            recycle={false}
            style={{
              inset: 0,
              pointerEvents: "none",
              position: "fixed",
              zIndex: 60,
            }}
            width={viewportWidth}
          />
        ) : null}

        {result && result.showDialog !== false ? (
          <GameResultDialog
            clearForCategoryChoice={() => clearToHome()}
            currentCategory={currentCategory}
            currentCategoryLabel={currentCategoryLabel}
            isBusy={isBusy}
            onPrimaryAction={() => {
              if (result.kind !== "daily") {
                startSelectedFlow();
                return;
              }

              if (!isSignedIn) {
                router.push("/sign-up");
                return;
              }

              clearToHome({ refresh: true });
            }}
            onSecondaryAction={() =>
              result.kind === "daily" ? clearToHome({ refresh: true }) : clearToHome()
            }
            primaryActionLabel={
              result.kind === "daily"
                ? isSignedIn
                  ? "Home"
                  : "Create account"
                : "Play again"
            }
            result={result}
            secondaryActionLabel="Home"
            startRound={startSelectedFlow}
          />
        ) : null}
      </>
    );
  }

  return (
    <section className="grid gap-4">
      <header className={`${surfaceClass} overflow-hidden p-5 sm:p-6`}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0f766e]/12 bg-[#0f766e]/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:border-[#24d4c2]/14 dark:bg-[#24d4c2]/8 dark:text-[#8ff4e7]">
                <Sparkles
                  aria-hidden="true"
                  className="size-3.5"
                  strokeWidth={2.2}
                />
                Choose your run
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/76 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:border-white/10 dark:bg-white/6 dark:text-[#9aa9bb]">
                <CalendarDays
                  aria-hidden="true"
                  className="size-3.5"
                  strokeWidth={2.2}
                />
                Resets in {resetCountdown}
              </span>
            </div>

            <div>
              <h1 className="m-0 font-serif-display text-[clamp(2.5rem,8vw,4.3rem)] font-semibold leading-[0.92] tracking-[-0.065em] text-[#1f1b17] dark:text-[#f5f7fb]">
                WikiGuesser
              </h1>
              <p className="m-0 mt-3 max-w-2xl text-[1rem] leading-7 text-[#6b6259] dark:text-[#9aa9bb]">
                Pick a lane, choose a category, then solve from the clues.
                Daily lets you play each category and mode once. Free play stays unlimited.
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-[28px] border border-black/8 bg-white/78 p-4 dark:border-white/10 dark:bg-white/6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="m-0 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
                  {selectedPlayType === "daily" ? "Today's daily" : "Free play"}
                </p>
                {selectedPlayType === "daily" &&
                selectedDailyOption?.playerStatus.hasPlayed ? (
                  <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-500/18 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700 dark:border-amber-300/16 dark:bg-amber-300/10 dark:text-amber-200">
                    <CircleAlert
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={2.1}
                    />
                    Already played today.
                  </span>
                ) : null}
                <strong className="mt-2 block font-serif-display text-[1.7rem] tracking-[-0.05em] text-[#1f1b17] dark:text-[#f5f7fb]">
                  {selectedPlayType === "daily"
                    ? `${toCategoryLabel(selectedCategory, categories)} · ${selectedModeMeta.label}`
                    : `${toCategoryLabel(selectedCategory, categories)} · ${selectedModeMeta.label}`}
                </strong>
              </div>
              <button
                className={primaryButtonClass}
                disabled={!canStartSelection || isBusy}
                onClick={startSelectedFlow}
                type="button"
              >
                {isBusy ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                    strokeWidth={2.2}
                  />
                ) : (
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={2.2}
                  />
                )}
                Start
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-[#6b6259] dark:text-[#9aa9bb]">
              {selectedPlayType === "daily" ? (
                <>
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1.5 dark:bg-white/8">
                    <Trophy aria-hidden="true" className="size-4" strokeWidth={2.1} />
                    {selectedDailyOption?.playerStatus.hasPlayed
                      ? `${selectedDailyScore ?? 0} pts today`
                      : "One daily run per category and mode"}
                  </span>
                  {/* Leaderboard temporarily disabled while it gets reworked.
                  <Link
                    className={`${secondaryButtonClass} px-3 py-2`}
                    href="/leaderboard"
                  >
                    <Crown aria-hidden="true" className="size-4" strokeWidth={2.1} />
                    Leaderboard
                  </Link>
                  */}
                </>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1.5 dark:bg-white/8">
                  <Shuffle aria-hidden="true" className="size-4" strokeWidth={2.1} />
                  Unlimited rounds. Mixed category available.
                </span>
              )}
            </div>

            {claimBanner ? (
              <div className="rounded-full border border-emerald-500/18 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-400/18 dark:bg-emerald-400/10 dark:text-emerald-200">
                {claimBanner}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className={`${surfaceClass} p-5 sm:p-6`}>
        <div className="grid gap-5">
          <div className="grid gap-3">
            <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
              <Sparkles
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.2}
              />
              1. Play type
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {([
                {
                  id: "daily" as const,
                  label: "Daily",
                  hint: "One daily run per category and mode.",
                  icon: CalendarDays,
                },
                {
                  id: "free-play" as const,
                  label: "Free play",
                  hint: "Unlimited rounds with mixed category available.",
                  icon: Shuffle,
                },
              ] as const).map((option) => {
                const OptionIcon = option.icon;

                return (
                  <button
                    className={selectionCardClass(selectedPlayType === option.id)}
                    key={option.id}
                    onClick={() => setSelectedPlayType(option.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.12))] p-2.5 dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))]">
                        <OptionIcon
                          aria-hidden="true"
                          className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]"
                          strokeWidth={2.1}
                        />
                      </span>
                    </div>
                    <strong className="font-serif-display text-[1.55rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                      {option.label}
                    </strong>
                    <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
              <Compass
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.2}
              />
              2. Category
            </div>

            <div
              className={`grid gap-3 sm:grid-cols-2 ${
                showRandomMix ? "xl:grid-cols-3" : "xl:grid-cols-2"
              }`}
            >
              {showRandomMix ? (
                <button
                  className={selectionCardClass(selectedCategory === "random")}
                  onClick={() => setSelectedCategory("random")}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex rounded-2xl bg-linear-to-br p-2.5 ${CATEGORY_META.random.accent}`}
                    >
                      <Shuffle
                        aria-hidden="true"
                        className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]"
                        strokeWidth={2.1}
                      />
                    </span>
                  </div>
                  <strong className="font-serif-display text-[1.55rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                    Mixed category
                  </strong>
                  <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">
                    Random across every live category.
                  </span>
                </button>
              ) : null}

              {categories.map((category) => {
                const categoryMeta = getCategoryMeta(category.id);
                const CategoryIcon = categoryMeta.icon;

                return (
                  <button
                    className={selectionCardClass(
                      selectedCategory === category.id,
                      category.entityCount === 0,
                    )}
                    disabled={category.entityCount === 0}
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`inline-flex rounded-2xl bg-linear-to-br p-2.5 ${categoryMeta.accent}`}
                      >
                        <CategoryIcon
                          aria-hidden="true"
                          className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]"
                          strokeWidth={2.1}
                        />
                      </span>
                    </div>
                    <strong className="font-serif-display text-[1.55rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                      {category.label}
                    </strong>
                    <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">
                      {categoryMeta.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
              <Sparkles
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.2}
              />
              3. Mode
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {GAME_MODE_OPTIONS.map((mode) => {
                const dailyModeOption =
                  selectedPlayType === "daily" && selectedCategory
                    ? selectedCategoryDailyOptions.find(
                        (option) => option.mode === mode.id,
                      ) ?? null
                    : null;
                const isDisabled =
                  !selectedCategory ||
                  (selectedPlayType === "free-play" && totalSelectedEntityCount === 0) ||
                  (selectedPlayType === "daily" &&
                    (!dailyModeOption || dailyModeOption.playerStatus.hasPlayed));
                const ModeIcon = mode.icon;

                return (
                  <button
                    className={selectionCardClass(selectedMode === mode.id, isDisabled)}
                    disabled={isDisabled}
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.12))] p-2.5 dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))]">
                        <ModeIcon
                          aria-hidden="true"
                          className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]"
                          strokeWidth={2.1}
                        />
                      </span>
                      {selectedPlayType === "daily" &&
                      dailyModeOption?.playerStatus.hasPlayed ? (
                        <span className="rounded-full border border-amber-500/18 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-300/16 dark:bg-amber-300/10 dark:text-amber-200">
                          Played
                        </span>
                      ) : (
                        <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-semibold text-[#6b6259] dark:bg-white/8 dark:text-[#9aa9bb]">
                          {mode.summary}
                        </span>
                      )}
                    </div>
                    <strong className="font-serif-display text-[1.55rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                      {mode.label}
                    </strong>
                    <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">
                      {mode.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-black/8 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium ${statusAppearance.className}`}
            >
              <StatusIcon
                aria-hidden="true"
                className="size-4 shrink-0"
                strokeWidth={2.2}
              />
              <span>{message}</span>
            </div>

            <button
              className={primaryButtonClass}
              disabled={!canStartSelection || isBusy}
              onClick={startSelectedFlow}
              type="button"
            >
              {isBusy ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                  strokeWidth={2.2}
                />
              ) : (
                <ArrowRight
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2.2}
                />
              )}
              Start
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
