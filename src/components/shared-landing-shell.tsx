"use client";

import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { CalendarDays, Gamepad2, LoaderCircle, Play } from "lucide-react";

import {
  GAME_MODE_OPTIONS,
  primaryButtonClass,
} from "@/src/components/game-shell/config";
import { GamePlayView } from "@/src/components/game-shell/play-view";
import { GameResultDialog } from "@/src/components/game-shell/result-dialog";
import type {
  ActiveRound,
  GuessAttempt,
  RoundOutcome,
} from "@/src/components/game-shell/types";
import { useViewportSize } from "@/src/components/game-shell/use-viewport-size";
import {
  getMessageAppearance,
  getModeMeta,
  isClueLocked,
  toPlayableClues,
} from "@/src/components/game-shell/utils";
import { normalizeGuess } from "@/src/lib/game/answer-matching";
import {
  findOtherAvailableDaily,
  getDailyComboKey,
} from "@/src/lib/game/daily";
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

const launcherModeCopy: Record<
  GameMode,
  {
    dailyDescription: string;
    dailyTitle: string;
    freeDescription: string;
    freeTitle: string;
  }
> = {
  classic: {
    dailyDescription: "Clues reveal after every miss.",
    dailyTitle: "Classic Daily",
    freeDescription: "Guess, miss, reveal.",
    freeTitle: "Classic",
  },
  "blurred-lines": {
    dailyDescription: "Reveal only what you need.",
    dailyTitle: "Choose Clues Daily",
    freeDescription: "Open only what you need.",
    freeTitle: "Choose Clues",
  },
};

const launcherSecondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[#0f766e]/36 px-5 py-3 text-sm font-semibold text-[#0f766e] transition hover:-translate-y-0.5 hover:border-[#0f766e]/56 hover:bg-[#0f766e]/6 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 dark:border-[#24d4c2]/42 dark:text-[#55e7d5] dark:hover:border-[#24d4c2]/64 dark:hover:bg-[#24d4c2]/7";

interface GameLauncherProps {
  claimBanner: string | null;
  dailyOptions: DailyChallengeOption[];
  isBusy: boolean;
  isClaimingPending: boolean;
  onStartDaily: (option: DailyChallengeOption) => void;
  onStartFreePlay: (mode: GameMode) => void;
  resetCountdown: string;
}

function GameLauncher({
  claimBanner,
  dailyOptions,
  isBusy,
  isClaimingPending,
  onStartDaily,
  onStartFreePlay,
  resetCountdown,
}: GameLauncherProps) {
  return (
    <section className="grid gap-5 pb-3 sm:gap-7">
      <header className="flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="m-0 font-serif-display text-[clamp(3rem,9vw,5.4rem)] font-semibold leading-[0.88] tracking-[-0.065em] text-[#1f1b17] dark:text-[#f5f7fb]">
          Pick your game
        </h1>
        <div className="inline-flex items-center gap-2 pb-1 text-sm font-medium text-[#6b6259] dark:text-[#9aa9bb]">
          <CalendarDays
            aria-hidden="true"
            className="size-4 text-[#0f766e] dark:text-[#24d4c2]"
            strokeWidth={2.1}
          />
          Daily resets in
          <strong className="font-semibold text-[#0f766e] dark:text-[#55e7d5]">
            {resetCountdown}
          </strong>
        </div>
      </header>

      {claimBanner ? (
        <div className="rounded-2xl border border-emerald-500/18 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-400/18 dark:bg-emerald-400/10 dark:text-emerald-200">
          {claimBanner}
        </div>
      ) : null}

      <div className="grid gap-4">
        <LauncherBand
          description="Two chances. One country each."
          isDaily
          title="Today"
        >
          {GAME_MODE_OPTIONS.map((mode) => {
            const option = dailyOptions.find(
              (candidate) => candidate.mode === mode.id,
            );
            const hasPlayed = option?.playerStatus.hasPlayed ?? false;
            const isDisabled =
              !option || hasPlayed || isBusy || isClaimingPending;

            return (
              <LauncherRow
                actionLabel={hasPlayed ? "Played" : "Play daily"}
                description={launcherModeCopy[mode.id].dailyDescription}
                disabled={isDisabled}
                icon={mode.icon}
                key={mode.id}
                onClick={() => {
                  if (option) {
                    onStartDaily(option);
                  }
                }}
                status={
                  hasPlayed
                    ? `Played · ${option?.playerStatus.score ?? 0} pts`
                    : "Not played"
                }
                title={launcherModeCopy[mode.id].dailyTitle}
                variant="primary"
              />
            );
          })}
        </LauncherBand>

        <LauncherBand description="Unlimited country rounds." title="Free play">
          {GAME_MODE_OPTIONS.map((mode) => (
            <LauncherRow
              actionLabel={`Play ${launcherModeCopy[mode.id].freeTitle}`}
              description={launcherModeCopy[mode.id].freeDescription}
              disabled={isBusy}
              icon={mode.icon}
              key={mode.id}
              onClick={() => onStartFreePlay(mode.id)}
              title={launcherModeCopy[mode.id].freeTitle}
              variant="secondary"
            />
          ))}
        </LauncherBand>
      </div>
    </section>
  );
}

interface LauncherBandProps {
  children: React.ReactNode;
  description: string;
  isDaily?: boolean;
  title: string;
}

function LauncherBand({
  children,
  description,
  isDaily = false,
  title,
}: LauncherBandProps) {
  const BandIcon = isDaily ? CalendarDays : Gamepad2;

  return (
    <section
      className={`overflow-hidden rounded-[30px] border ${
        isDaily
          ? "border-[#0f766e]/24 bg-[linear-gradient(145deg,rgba(15,118,110,0.08),rgba(255,255,255,0.8))] shadow-[0_20px_48px_rgba(15,118,110,0.08)] dark:border-[#24d4c2]/22 dark:bg-[linear-gradient(145deg,rgba(36,212,194,0.075),rgba(13,21,32,0.92))] dark:shadow-[0_20px_48px_rgba(0,0,0,0.22)]"
          : "border-black/10 bg-white/62 dark:border-white/10 dark:bg-white/[0.025]"
      }`}
    >
      <div className="grid lg:grid-cols-[minmax(230px,0.72fr)_minmax(0,1.6fr)]">
        <div className="flex flex-col justify-center border-b border-black/8 p-5 dark:border-white/10 sm:p-6 lg:border-b-0 lg:border-r">
          <span className="mb-4 hidden size-12 items-center justify-center rounded-full border border-[#0f766e]/24 text-[#0f766e] dark:border-[#24d4c2]/32 dark:text-[#55e7d5] lg:inline-flex">
            <BandIcon aria-hidden="true" className="size-5" strokeWidth={1.9} />
          </span>
          <h2 className="m-0 font-serif-display text-[clamp(2.15rem,6vw,3.45rem)] font-semibold tracking-[-0.055em] text-[#1f1b17] dark:text-[#f5f7fb]">
            {title}
          </h2>
          <p className="m-0 mt-2 text-[0.98rem] leading-6 text-[#6b6259] dark:text-[#9aa9bb]">
            {description}
          </p>
        </div>
        <div className="divide-y divide-black/8 px-4 dark:divide-white/10 sm:px-6">
          {children}
        </div>
      </div>
    </section>
  );
}

interface LauncherRowProps {
  actionLabel: string;
  description: string;
  disabled: boolean;
  icon: (typeof GAME_MODE_OPTIONS)[number]["icon"];
  onClick: () => void;
  status?: string;
  title: string;
  variant: "primary" | "secondary";
}

function LauncherRow({
  actionLabel,
  description,
  disabled,
  icon: ModeIcon,
  onClick,
  status,
  title,
  variant,
}: LauncherRowProps) {
  return (
    <div className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:py-6">
      <div className="flex min-w-0 items-center gap-4">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-[#0f766e]/24 text-[#0f766e] dark:border-[#24d4c2]/32 dark:text-[#55e7d5]">
          <ModeIcon aria-hidden="true" className="size-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h3 className="m-0 font-serif-display text-[1.55rem] font-semibold tracking-[-0.035em] text-[#1f1b17] dark:text-[#f5f7fb]">
            {title}
          </h3>
          <p className="m-0 mt-1 text-sm leading-6 text-[#6b6259] dark:text-[#9aa9bb]">
            {description}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        {status ? (
          <span className="whitespace-nowrap text-sm font-medium text-[#6b6259] dark:text-[#9aa9bb]">
            {status}
          </span>
        ) : null}
        <button
          aria-label={`${actionLabel}: ${title}`}
          className={`${variant === "primary" ? primaryButtonClass : launcherSecondaryButtonClass} w-full min-w-40 whitespace-nowrap px-5 disabled:hover:translate-y-0 sm:w-auto`}
          disabled={disabled}
          onClick={onClick}
          type="button"
        >
          {disabled && actionLabel !== "Played" ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin"
              strokeWidth={2.2}
            />
          ) : (
            <Play aria-hidden="true" className="size-4" strokeWidth={2.2} />
          )}
          {actionLabel}
        </button>
      </div>
    </div>
  );
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

function toCategoryLabel(
  category: string | null,
  categories: CategorySummary[],
) {
  if (category === "random") {
    return "Mixed category";
  }

  return (
    categories.find((entry) => entry.id === category)?.label ??
    "Pick a category"
  );
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
  const [guessedEntities, setGuessedEntities] = useState<GuessAttempt[]>([]);
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
  const otherAvailableDailyOption =
    result?.kind === "daily"
      ? findOtherAvailableDaily(dailyOptions, result)
      : null;
  const view = round ? "round" : result ? "result" : "menu";
  const currentMode = round?.mode ?? result?.mode ?? selectedMode;
  const currentClues = round?.clues ?? result?.clues ?? [];
  const visibleClassicClues = currentClues.filter((clue) => clue.isRevealed);
  const isCountryRound = round?.category === "countries";
  const hasGuess = guess.trim().length > 0;
  const normalizedGuess = normalizeGuess(guess);
  const normalizedGuessedEntities = new Set(
    guessedEntities.map((entry) => normalizeGuess(entry.name)),
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
    round?.category ?? result?.category ?? selectedCategory;
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

  function startFreePlay(mode: GameMode = selectedMode ?? "classic") {
    if (!defaultFreePlayCategory) {
      setMessage("Free play unavailable.");
      return;
    }

    setSelectedPlayType("free-play");
    setSelectedCategory(defaultFreePlayCategory);
    setSelectedMode(mode);
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
          category: defaultFreePlayCategory,
          mode,
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

  function startDaily(
    option: DailyChallengeOption | null = selectedDailyOption,
  ) {
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
      setMessage(
        payload.mode === "blurred-lines" ? "Tap a row." : "Daily live.",
      );
    });
  }

  function startSelectedFlow() {
    if (selectedPlayType === "daily") {
      void startDaily(selectedDailyOption);
      return;
    }

    void startFreePlay(selectedMode ?? "classic");
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
      setGuessedEntities((current) => [
        ...current,
        { name: submittedGuess, direction: payload.direction ?? null },
      ]);
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
      try {
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
      } catch {
        setMessage("Give up failed. Retry.");
      }
    });
  }

  if (view === "menu") {
    return (
      <GameLauncher
        claimBanner={claimBanner}
        dailyOptions={dailyOptions.filter(
          (option) => option.category === dailyData.defaultCategory,
        )}
        isBusy={isBusy}
        isClaimingPending={isClaimingPending}
        onStartDaily={(option) => void startDaily(option)}
        onStartFreePlay={(mode) => void startFreePlay(mode)}
        resetCountdown={resetCountdown}
      />
    );
  }

  {
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

              if (otherAvailableDailyOption) {
                void startDaily(otherAvailableDailyOption);
                return;
              }

              if (!isSignedIn) {
                router.push("/sign-up");
                return;
              }

              clearToHome({ refresh: true });
            }}
            onSecondaryAction={() =>
              result.kind === "daily"
                ? clearToHome({ refresh: true })
                : clearToHome()
            }
            onTertiaryAction={
              result.kind === "daily" &&
              !isSignedIn &&
              !otherAvailableDailyOption
                ? () => {
                    router.push("/sign-in");
                  }
                : undefined
            }
            primaryActionIcon={
              result.kind === "daily" && otherAvailableDailyOption
                ? Play
                : undefined
            }
            primaryActionLabel={
              result.kind === "daily"
                ? otherAvailableDailyOption
                  ? `Play ${launcherModeCopy[otherAvailableDailyOption.mode].dailyTitle}`
                  : isSignedIn
                    ? "Home"
                    : "Create account"
                : "Play again"
            }
            result={result}
            secondaryActionLabel={
              result.kind === "daily" &&
              isSignedIn &&
              !otherAvailableDailyOption
                ? null
                : "Home"
            }
            startRound={startSelectedFlow}
            tertiaryActionLabel={
              result.kind === "daily" &&
              !isSignedIn &&
              !otherAvailableDailyOption
                ? "Log in"
                : undefined
            }
          />
        ) : null}
      </>
    );
  }
}
