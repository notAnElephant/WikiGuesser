"use client";

import { primaryButtonClass, surfaceClass } from "@/src/components/game-shell/config";
import { GamePlayView } from "@/src/components/game-shell/play-view";
import { GameResultDialog } from "@/src/components/game-shell/result-dialog";
import type { ActiveRound, RoundOutcome } from "@/src/components/game-shell/types";
import {
  getCategoryMeta,
  getMenuMessage,
  getMessageAppearance,
  getModeMeta,
  isClueLocked,
  toPlayableClues
} from "@/src/components/game-shell/utils";
import { normalizeGuess } from "@/src/lib/game/answer-matching";
import { getDailyComboKey } from "@/src/lib/game/daily";
import type {
  DailyChallengeCard,
  DailyHomeData,
  EntityCategory,
  GameMode,
  GuessRoundResult,
  RevealClueResult,
  StartRoundResult
} from "@/src/lib/types";
import { ArrowRight, CalendarDays, Crown, LoaderCircle, Sparkles, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";

interface DailyChallengeShellProps {
  countryOptions: string[];
  data: DailyHomeData;
  hasPendingClaim: boolean;
  isSignedIn: boolean;
}

type LeaderboardPeriod = "today" | "total";

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

function toCategoryLabel(category: EntityCategory) {
  return category[0]!.toUpperCase() + category.slice(1);
}

export function DailyChallengeShell({
  countryOptions,
  data,
  hasPendingClaim,
  isSignedIn,
}: DailyChallengeShellProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<EntityCategory>(
    data.defaultCategory,
  );
  const [selectedMode, setSelectedMode] = useState<GameMode>(data.defaultMode);
  const [leaderboardPeriod, setLeaderboardPeriod] =
    useState<LeaderboardPeriod>("today");
  const [round, setRound] = useState<ActiveRound | null>(null);
  const [result, setResult] = useState<RoundOutcome | null>(null);
  const [guess, setGuess] = useState("");
  const [guessedEntities, setGuessedEntities] = useState<string[]>([]);
  const [message, setMessage] = useState("Daily challenge");
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

  useEffect(() => {
    setSelectedCategory(data.defaultCategory);
    setSelectedMode(data.defaultMode);
  }, [data.defaultCategory, data.defaultMode]);

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

  const validCountryLookup = useMemo(
    () =>
      new Map(countryOptions.map((option) => [normalizeGuess(option), option])),
    [countryOptions],
  );

  const cards = useMemo(
    () =>
      data.cards.map((card) => {
        const override =
          playedOverrides[getDailyComboKey(card.category, card.mode)];

        return override
          ? {
              ...card,
              playerStatus: {
                hasPlayed: true,
                score: override.score,
                completedAt: override.completedAt,
              },
            }
          : card;
      }),
    [data.cards, playedOverrides],
  );
  const selectedComboKey = getDailyComboKey(selectedCategory, selectedMode);
  const selectedCard =
    cards.find(
      (card) =>
        card.category === selectedCategory && card.mode === selectedMode,
    ) ?? cards[0]!;
  const leaderboard =
    data.leaderboardByCombo[selectedComboKey] ??
    data.leaderboardByCombo[
      getDailyComboKey(data.defaultCategory, data.defaultMode)
    ]!;
  const leaderboardEntries =
    leaderboardPeriod === "today" ? leaderboard.today : leaderboard.total;
  const view = round ? "round" : result ? "result" : "menu";
  const currentMode = round?.mode ?? result?.mode ?? selectedCard.mode;
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
  const currentCategory =
    round?.category ?? result?.category ?? selectedCard.category;
  const currentCategoryLabel = toCategoryLabel(currentCategory);
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
  const canStartSelected = Boolean(
    selectedCard && !selectedCard.playerStatus.hasPlayed && !isClaimingPending,
  );

  function clearToHub(options?: { refresh?: boolean }) {
    setRound(null);
    setResult(null);
    setGuess("");
    setGuessedEntities([]);
    setScore(null);
    setMessage("Daily challenge");
    setIsSyncingReveal(false);

    if (options?.refresh) {
      router.refresh();
    }
  }

  function startDaily(card: DailyChallengeCard = selectedCard) {
    if (card.playerStatus.hasPlayed) {
      setMessage("Already played today.");
      return;
    }

    setSelectedCategory(card.category);
    setSelectedMode(card.mode);
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
            category: card.category,
            mode: card.mode,
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
      setMessage(
        payload.mode === "blurred-lines" ? "Tap a row." : "Daily live.",
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

      if (payload.isCorrect || payload.isComplete) {
        setRound(null);
        setResult({
          status: payload.isCorrect ? "win" : "loss",
          canonicalAnswer: payload.canonicalAnswer ?? "Unknown",
          score: payload.isCorrect ? payload.score : 0,
          kind: "daily",
          category: payload.category,
          mode: payload.mode,
          clues: payload.clues,
        });
        setPlayedOverrides((current) => ({
          ...current,
          [getDailyComboKey(payload.category, payload.mode)]: {
            score: payload.score,
            completedAt: new Date().toISOString(),
          },
        }));
        setMessage(
          payload.isCorrect
            ? "Correct."
            : `Answer: ${payload.canonicalAnswer ?? "Unknown"}.`,
        );
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
      setMessage(
        payload.mode === "blurred-lines"
          ? "Tap a row."
          : getMenuMessage(payload.category, payload.mode),
      );
    });
  }

  function handleGuessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitGuess();
  }

  if (view !== "menu") {
    return (
      <>
        <GamePlayView
          availableCountryOptions={availableCountryOptions}
          canSubmitGuess={canSubmitGuess}
          clearForCategoryChoice={() => clearToHub()}
          currentCategory={currentCategory}
          currentCategoryLabel={currentCategoryLabel}
          currentClues={currentClues}
          currentMode={currentMode}
          displayScore={displayScore}
          flowLabel="Daily"
          guess={guess}
          guessedEntities={guessedEntities}
          guessButtonLabel={guessButtonLabel}
          handleGuessSubmit={handleGuessSubmit}
          homeButtonLabel="Daily hub"
          isBusy={isBusy}
          isCountryRound={isCountryRound}
          message={message}
          result={result}
          restartButtonLabel="Restart daily"
          revealClue={revealClue}
          revealedCount={revealedCount}
          round={round}
          setGuess={setGuess}
          startRound={() => startDaily(selectedCard)}
          statusAppearance={statusAppearance}
          validationMessage={validationMessage}
          view={view === "result" ? "result" : "round"}
          visibleClassicClues={visibleClassicClues}
        />

        {result ? (
          <GameResultDialog
            clearForCategoryChoice={() => clearToHub()}
            currentCategory={currentCategory}
            currentCategoryLabel={currentCategoryLabel}
            isBusy={isBusy}
            onPrimaryAction={() => {
              if (!isSignedIn) {
                router.push("/sign-up");
                return;
              }

              clearToHub({ refresh: true });
            }}
            onSecondaryAction={() => clearToHub()}
            primaryActionLabel={
              isSignedIn ? "Daily leaderboard" : "Create account"
            }
            result={result}
            secondaryActionLabel="Daily hub"
            startRound={() => startDaily(selectedCard)}
          />
        ) : null}
      </>
    );
  }

  return (
    <section className="grid gap-4">
      <div className={`${surfaceClass} overflow-hidden p-5 sm:p-7`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0f766e]/12 bg-[#0f766e]/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:border-[#24d4c2]/14 dark:bg-[#24d4c2]/8 dark:text-[#8ff4e7]">
            <Sparkles
              aria-hidden="true"
              className="size-3.5"
              strokeWidth={2.2}
            />
            Daily challenge
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

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:items-end">
          <div>
            <h1 className="m-0 max-w-[10ch] font-serif-display text-[clamp(2.4rem,8vw,4.6rem)] font-semibold leading-[0.92] tracking-[-0.065em] text-[#1f1b17] dark:text-[#f5f7fb]">
              WikiGuesser
            </h1>
            <p className="m-0 mt-4 max-w-xl text-[1.02rem] leading-7 text-[#6b6259] dark:text-[#9aa9bb]">
              One shared shot per category and mode. Build today. Climb total.
            </p>
          </div>

          <div className="rounded-[28px] border border-black/8 bg-white/78 p-5 dark:border-white/10 dark:bg-white/6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="m-0 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
                  Today
                </p>
                <strong className="mt-2 block font-serif-display text-[1.9rem] tracking-[-0.05em] text-[#1f1b17] dark:text-[#f5f7fb]">
                  {data.dayKey}
                </strong>
              </div>
              <button
                className={primaryButtonClass}
                disabled={!canStartSelected || isBusy}
                onClick={() => startDaily(selectedCard)}
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
                {selectedCard.playerStatus.hasPlayed ? "Played" : "Start daily"}
              </button>
            </div>
            {claimBanner ? (
              <div className="mt-4 rounded-full border border-emerald-500/18 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-400/18 dark:bg-emerald-400/10 dark:text-emerald-200">
                {claimBanner}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className={`${surfaceClass} grid gap-4 p-5 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
              <Trophy aria-hidden="true" className="size-4" strokeWidth={2.2} />
              Daily combos
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((card) => {
              const comboKey = getDailyComboKey(card.category, card.mode);
              const isSelected = comboKey === selectedComboKey;
              const CategoryIcon = getCategoryMeta(card.category).icon;
              const ModeIcon = getModeMeta(card.mode).icon;

              return (
                <button
                  className={`grid gap-3 rounded-[28px] border p-4 text-left transition ${
                    isSelected
                      ? "border-[#0f766e] bg-[linear-gradient(160deg,rgba(15,118,110,0.14),rgba(255,255,255,0.94))] shadow-[0_18px_44px_rgba(15,118,110,0.14)] dark:border-[#24d4c2]/60 dark:bg-[linear-gradient(160deg,rgba(36,212,194,0.14),rgba(17,24,39,0.94))]"
                      : "border-black/10 bg-white/86 hover:-translate-y-0.5 dark:border-white/10 dark:bg-[rgba(13,21,32,0.84)]"
                  }`}
                  key={comboKey}
                  onClick={() => {
                    setSelectedCategory(card.category);
                    setSelectedMode(card.mode);
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.12))] p-2.5 dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))]">
                        <CategoryIcon
                          aria-hidden="true"
                          className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]"
                          strokeWidth={2.1}
                        />
                      </span>
                      <span className="inline-flex rounded-2xl bg-white/76 p-2.5 dark:bg-white/8">
                        <ModeIcon
                          aria-hidden="true"
                          className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]"
                          strokeWidth={2.1}
                        />
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        card.playerStatus.hasPlayed
                          ? "bg-black/5 text-[#6b6259] dark:bg-white/8 dark:text-[#c7d3e2]"
                          : "bg-[#0f766e]/10 text-[#115e59] dark:bg-[#24d4c2]/10 dark:text-[#8ff4e7]"
                      }`}
                    >
                      {card.playerStatus.hasPlayed ? "Played" : "New"}
                    </span>
                  </div>
                  <div>
                    <strong className="block font-serif-display text-[1.45rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                      {toCategoryLabel(card.category)}
                    </strong>
                    <span className="mt-1 block text-sm text-[#6b6259] dark:text-[#9aa9bb]">
                      {getModeMeta(card.mode).label}
                    </span>
                  </div>
                  {card.playerStatus.hasPlayed ? (
                    <div className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">
                      {card.playerStatus.score} pts
                    </div>
                  ) : (
                    <div className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">
                      Same puzzle for everyone today.
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <aside className={`${surfaceClass} grid gap-4 p-5 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
              <Crown aria-hidden="true" className="size-4" strokeWidth={2.2} />
              Leaderboard
            </div>
            <div className="inline-flex rounded-full border border-black/8 bg-white/76 p-1 dark:border-white/10 dark:bg-white/6">
              {(["today", "total"] as const).map((period) => (
                <button
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    leaderboardPeriod === period
                      ? "bg-[#0f766e] text-white dark:bg-[#24d4c2] dark:text-[#082825]"
                      : "text-[#6b6259] dark:text-[#9aa9bb]"
                  }`}
                  key={period}
                  onClick={() => setLeaderboardPeriod(period)}
                  type="button"
                >
                  {period === "today" ? "Today" : "Total"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-black/8 bg-white/76 p-4 dark:border-white/10 dark:bg-white/6">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
              {toCategoryLabel(selectedCard.category)} ·{" "}
              {getModeMeta(selectedCard.mode).label}
            </div>
            <div className="mt-3 grid gap-2">
              {leaderboardEntries.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-black/10 px-4 py-6 text-center text-sm text-[#6b6259] dark:border-white/10 dark:text-[#9aa9bb]">
                  No scores yet.
                </div>
              ) : (
                leaderboardEntries.map((entry, index) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-[22px] border border-black/8 bg-white/84 px-4 py-3 dark:border-white/10 dark:bg-[rgba(255,255,255,0.05)]"
                    key={`${entry.playerKey}-${index}`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1f1b17] dark:text-[#f5f7fb]">
                        {index + 1}. {entry.displayName}
                      </div>
                      <div className="text-xs text-[#6b6259] dark:text-[#9aa9bb]">
                        {leaderboardPeriod === "today"
                          ? entry.completedAt
                            ? new Date(entry.completedAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "Today"
                          : `${entry.roundsWon ?? 0} wins`}
                      </div>
                    </div>
                    <strong className="text-[#115e59] dark:text-[#8ff4e7]">
                      {entry.score}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
