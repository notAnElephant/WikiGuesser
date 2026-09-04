"use client";

import { GoogleOneTap } from "@clerk/nextjs";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  CalendarDays,
  Gamepad2,
  Globe2,
  LoaderCircle,
  Play,
  X,
} from "lucide-react";

import { DuelCreator } from "@/src/components/duel/duel-creator";
import { GAME_MODE_OPTIONS } from "@/src/components/game-shell/config";
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
import { captureAnalyticsEvent, toGameContext } from "@/src/lib/analytics";
import { CONTINENT_LABELS } from "@/src/lib/content/continents";
import {
  findOtherAvailableDaily,
  getDailyComboKey,
} from "@/src/lib/game/daily";
import type {
  CategorySummary,
  ContinentId,
  ContinentOption,
  DailyChallengeOption,
  DailyLandingData,
  GameMode,
  GuessRoundResult,
  RevealClueResult,
  StartRoundResult,
} from "@/src/lib/types";

interface SharedLandingShellProps {
  categories: CategorySummary[];
  continentOptions: ContinentOption[];
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

interface GameLauncherProps {
  claimBanner: string | null;
  continentOptions: ContinentOption[];
  dailyOptions: DailyChallengeOption[];
  isBusy: boolean;
  isClaimingPending: boolean;
  onStartDaily: (option: DailyChallengeOption) => void;
  onStartFreePlay: (mode: GameMode, continent: ContinentId | null) => void;
  resetCountdown: string;
  selectedContinent: ContinentId | null;
  totalCountryCount: number;
}

export function GameLauncher({
  claimBanner,
  continentOptions,
  dailyOptions,
  isBusy,
  isClaimingPending,
  onStartDaily,
  onStartFreePlay,
  resetCountdown,
  selectedContinent,
  totalCountryCount,
}: GameLauncherProps) {
  const [pendingFreePlayMode, setPendingFreePlayMode] =
    useState<GameMode | null>(null);

  function startFilteredFreePlay(continent: ContinentId | null) {
    if (!pendingFreePlayMode) {
      return;
    }

    const mode = pendingFreePlayMode;
    setPendingFreePlayMode(null);
    onStartFreePlay(mode, continent);
  }

  return (
    <section className="grid gap-5 pb-3 sm:gap-7">
      <header className="flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="m-0 font-heading text-4xl sm:text-5xl font-semibold leading-tight tracking-tight text-primary">
          Pick your game
        </h1>
        <div className="inline-flex items-center gap-2 pb-1 text-sm font-medium text-secondary">
          <CalendarDays
            aria-hidden="true"
            className="size-4 text-accent"
            strokeWidth={2.1}
          />
          Daily resets in
          <strong className="font-semibold text-accent">
            {resetCountdown}
          </strong>
        </div>
      </header>

      {claimBanner ? (
        <div className="rounded-2xl border border-success bg-success-muted px-4 py-3 text-sm font-medium text-success">
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
              onClick={() => setPendingFreePlayMode(mode.id)}
              title={launcherModeCopy[mode.id].freeTitle}
              variant="secondary"
            />
          ))}
        </LauncherBand>
      </div>

      {pendingFreePlayMode ? (
        <ContinentPickerDialog
          continentOptions={continentOptions}
          mode={pendingFreePlayMode}
          onClose={() => setPendingFreePlayMode(null)}
          onSelect={startFilteredFreePlay}
          selectedContinent={selectedContinent}
          totalCountryCount={totalCountryCount}
        />
      ) : null}
    </section>
  );
}

interface ContinentPickerDialogProps {
  continentOptions: ContinentOption[];
  mode: GameMode;
  onClose: () => void;
  onSelect: (continent: ContinentId | null) => void;
  selectedContinent: ContinentId | null;
  totalCountryCount: number;
}

function ContinentPickerDialog({
  continentOptions,
  mode,
  onClose,
  onSelect,
  selectedContinent,
  totalCountryCount,
}: ContinentPickerDialogProps) {
  return (
    <Dialog
      isOpen
      maxHeight="calc(100dvh - var(--spacing-8))"
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      padding={6}
      width="42rem"
    >
      <DialogHeader
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
        startContent={<Globe2 aria-hidden="true" className="text-accent" />}
        subtitle="Pick the country pool for this round."
        title="Choose a continent"
      />
      <div className="grid gap-3 pt-4 sm:grid-cols-2">
        <SelectableCard
          isSelected={selectedContinent === null}
          label="All continents"
          onChange={() => onSelect(null)}
          padding={4}
        >
          <strong className="block font-heading text-xl text-primary">
            All continents
          </strong>
          <span className="mt-1 block text-sm text-secondary">
            {totalCountryCount} countries
          </span>
        </SelectableCard>

        {continentOptions.map((option) => (
          <SelectableCard
            isSelected={selectedContinent === option.id}
            key={option.id}
            label={option.label}
            onChange={() => onSelect(option.id)}
            padding={4}
          >
            <strong className="block font-heading text-xl text-primary">
              {option.label}
            </strong>
            <span className="mt-1 block text-sm text-secondary">
              {option.entityCount} countries
            </span>
          </SelectableCard>
        ))}
      </div>
      <p className="m-0 pt-4 text-xs text-secondary">
        {launcherModeCopy[mode].freeTitle} free play
      </p>
    </Dialog>
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
    <Card
      className="overflow-hidden"
      elevation={isDaily ? "low" : "none"}
      padding={0}
    >
      <div className="grid lg:grid-cols-[minmax(230px,0.72fr)_minmax(0,1.6fr)]">
        <div className="flex flex-col justify-center border-b border-border p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <span className="mb-4 hidden size-12 items-center justify-center rounded-md border border-border bg-surface text-accent lg:inline-flex">
            <BandIcon aria-hidden="true" className="size-5" strokeWidth={1.9} />
          </span>
          <h2 className="m-0 font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-primary">
            {title}
          </h2>
          <p className="m-0 mt-2 text-base leading-6 text-secondary">
            {description}
          </p>
        </div>
        <div className="divide-y divide-border px-4 sm:px-6">{children}</div>
      </div>
    </Card>
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
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-accent">
          <ModeIcon aria-hidden="true" className="size-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h3 className="m-0 font-heading text-xl font-semibold tracking-tight text-primary">
            {title}
          </h3>
          <p className="m-0 mt-1 text-sm leading-6 text-secondary">
            {description}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        {status ? (
          <span className="whitespace-nowrap text-sm font-medium text-secondary">
            {status}
          </span>
        ) : null}
        <Button
          className="min-w-40 whitespace-nowrap"
          icon={
            disabled && actionLabel !== "Played" ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Play aria-hidden="true" />
            )
          }
          isDisabled={disabled}
          label={`${actionLabel}: ${title}`}
          onClick={onClick}
          size="lg"
          variant={variant}
          width="100%"
        >
          {actionLabel}
        </Button>
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
  continentOptions,
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
  const [selectedContinent, setSelectedContinent] =
    useState<ContinentId | null>(null);
  const [round, setRound] = useState<ActiveRound | null>(null);
  const [result, setResult] = useState<RoundOutcome | null>(null);
  const [guess, setGuess] = useState("");
  const [guessedEntities, setGuessedEntities] = useState<GuessAttempt[]>([]);
  const [message, setMessageState] = useState("Start today's daily.");
  const [messageRevision, setMessageRevision] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [isSyncingReveal, setIsSyncingReveal] = useState(false);
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);
  const isSubmittingGuessRef = useRef(false);
  const [claimBanner, setClaimBanner] = useState<string | null>(null);
  const [isClaimingPending, setIsClaimingPending] = useState(
    isSignedIn && hasPendingClaim,
  );
  const [resetCountdown, setResetCountdown] = useState("00:00");
  const [playedOverrides, setPlayedOverrides] = useState<
    Record<string, PlayedOverride>
  >({});

  function setMessage(nextMessage: string) {
    setMessageState(nextMessage);
    setMessageRevision((current) => current + 1);
  }
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
  const isCountryRound = (round?.category ?? result?.category) === "countries";
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
    !isSubmittingGuess &&
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
  const isBusy = isPending || isSubmittingGuess || isSyncingReveal;
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

  function startFreePlay(
    mode: GameMode = selectedMode ?? "classic",
    continent: ContinentId | null = selectedContinent,
  ) {
    if (!defaultFreePlayCategory) {
      setMessage("Free play unavailable.");
      return;
    }

    setSelectedPlayType("free-play");
    setSelectedCategory(defaultFreePlayCategory);
    setSelectedMode(mode);
    setSelectedContinent(continent);
    setGuess("");
    setGuessedEntities([]);
    setScore(null);
    setResult(null);
    setIsSyncingReveal(false);

    startTransition(async () => {
      try {
        const response = await fetch("/api/rounds/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category: defaultFreePlayCategory,
            continent: continent ?? undefined,
            mode,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          setMessage(payload?.error ?? "Round failed. Retry.");
          return;
        }

        const payload = (await response.json()) as StartRoundResult;
        captureAnalyticsEvent("game_started", {
          ...toGameContext(
            payload.kind,
            payload.category,
            payload.mode,
            payload.continent,
          ),
        });
        setRound(payload);
        setMessage(
          payload.mode === "blurred-lines" ? "Tap a row." : "Round live.",
        );
      } catch {
        setMessage("Round failed. Retry.");
      }
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
      captureAnalyticsEvent("game_started", {
        ...toGameContext(
          payload.kind,
          payload.category,
          payload.mode,
          payload.continent,
        ),
      });
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
        captureAnalyticsEvent("clue_revealed", {
          ...toGameContext(
            payload.kind,
            payload.category,
            payload.mode,
            payload.continent,
          ),
          clue_key: clueKey,
          clues_revealed: payload.clues.filter((entry) => entry.isRevealed)
            .length,
        });
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

  function submitGuess(mapCountryName?: string) {
    if (isSubmittingGuessRef.current) {
      return;
    }

    const isMapGuess = Boolean(mapCountryName);
    const guessValue = mapCountryName ?? guess.trim();

    if (!round || !guessValue) {
      return;
    }

    if (!isMapGuess && isCountryRound && !isCountryGuessValid) {
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

    if (!isMapGuess && isAlreadyGuessed) {
      setMessage("Already tried.");
      return;
    }

    const submittedGuess = isMapGuess
      ? guessValue
      : isCountryRound
        ? (validCountryLookup.get(normalizedGuess) ?? guess.trim())
        : guess.trim();

    isSubmittingGuessRef.current = true;
    setIsSubmittingGuess(true);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/rounds/${round.roundId}/guess`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: round.token,
            guess: submittedGuess,
            method: isMapGuess ? "map" : "text",
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
        const attemptNumber = guessedEntities.length + 1;
        const cluesRevealed = payload.clues.filter(
          (entry) => entry.isRevealed,
        ).length;
        captureAnalyticsEvent("guess_submitted", {
          ...toGameContext(
            payload.kind,
            payload.category,
            payload.mode,
            payload.continent,
          ),
          attempt_number: attemptNumber,
          completed: payload.isComplete,
          correct: payload.isCorrect,
        });

        if (payload.isComplete) {
          captureAnalyticsEvent("game_completed", {
            ...toGameContext(
              payload.kind,
              payload.category,
              payload.mode,
              payload.continent,
            ),
            clues_revealed: cluesRevealed,
            guesses: attemptNumber,
            outcome: payload.isCorrect ? "win" : "loss",
            score: payload.score,
          });
        }

        setGuessedEntities((current) => [
          ...current,
          {
            name: payload.guessedCountry?.name ?? submittedGuess,
            direction: payload.direction ?? null,
            mapData: payload.guessedCountry ?? null,
          },
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
            solutionCountry: payload.solutionCountry,
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
            solutionCountry: payload.solutionCountry,
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
          continent: payload.continent,
          mode: payload.mode,
          clues: payload.clues,
          revealedClues: payload.revealedClues,
          remainingClues: payload.remainingClues,
          canGuess: payload.canGuess,
        });
        setMessage(getMissMessage(payload));
      } finally {
        isSubmittingGuessRef.current = false;
        setIsSubmittingGuess(false);
      }
    });
  }

  function handleGuessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitGuess();
  }

  function handleMapGuess(countryName: string) {
    void submitGuess(countryName);
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
        const cluesRevealed = payload.clues.filter(
          (entry) => entry.isRevealed,
        ).length;
        const gameContext = toGameContext(
          payload.kind,
          payload.category,
          payload.mode,
          payload.continent,
        );
        captureAnalyticsEvent("game_given_up", {
          ...gameContext,
          clues_revealed: cluesRevealed,
          guesses: guessedEntities.length,
        });
        captureAnalyticsEvent("game_completed", {
          ...gameContext,
          clues_revealed: cluesRevealed,
          guesses: guessedEntities.length,
          outcome: "loss",
          score: payload.score,
        });
        setRound(null);
        setResult({
          status: "loss",
          canonicalAnswer: payload.canonicalAnswer ?? "Unknown",
          score: 0,
          kind: payload.kind,
          category: payload.category,
          mode: payload.mode,
          clues: payload.clues,
          solutionCountry: payload.solutionCountry,
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
      <div className="grid gap-6">
        <GameLauncher
          claimBanner={claimBanner}
          continentOptions={continentOptions}
          dailyOptions={dailyOptions.filter(
            (option) => option.category === dailyData.defaultCategory,
          )}
          isBusy={isBusy}
          isClaimingPending={isClaimingPending}
          onStartDaily={(option) => void startDaily(option)}
          onStartFreePlay={(mode, continent) =>
            void startFreePlay(mode, continent)
          }
          resetCountdown={resetCountdown}
          selectedContinent={selectedContinent}
          totalCountryCount={countryOptions.length}
        />
        <DuelCreator categories={categories} isSignedIn={isSignedIn} />
      </div>
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
          flowLabel={
            isDailyFlow
              ? "Daily"
              : selectedContinent
                ? `${CONTINENT_LABELS[selectedContinent]} free play`
                : "Free play"
          }
          guess={guess}
          guessedEntities={guessedEntities}
          guessButtonLabel={guessButtonLabel}
          handleGuessSubmit={handleGuessSubmit}
          handleMapGuess={handleMapGuess}
          homeButtonLabel="Home"
          isBusy={isBusy}
          isCountryRound={isCountryRound}
          message={message}
          messageRevision={messageRevision}
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

        {result?.status === "win" &&
        result.showDialog !== false &&
        viewportWidth > 0 &&
        viewportHeight > 0 ? (
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
          <>
            {result.kind === "daily" && !isSignedIn ? (
              <GoogleOneTap
                signInForceRedirectUrl="/"
                signUpForceRedirectUrl="/profile-name"
              />
            ) : null}
            <GameResultDialog
              clearForCategoryChoice={() => clearToHome()}
              currentCategory={currentCategory}
              currentCategoryLabel={currentCategoryLabel}
              guessedCountries={guessedEntities.flatMap((attempt) =>
                attempt.mapData ? [attempt.mapData] : [],
              )}
              isBusy={isBusy}
              onClose={() =>
                setResult((current) =>
                  current ? { ...current, showDialog: false } : current,
                )
              }
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
              onSecondaryAction={() => {
                if (
                  result.kind === "daily" &&
                  !isSignedIn &&
                  otherAvailableDailyOption
                ) {
                  router.push("/sign-up");
                  return;
                }

                result.kind === "daily"
                  ? clearToHome({ refresh: true })
                  : clearToHome();
              }}
              onTertiaryAction={
                result.kind === "daily" && !isSignedIn
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
                result.kind === "daily" && otherAvailableDailyOption
                  ? isSignedIn
                    ? "Home"
                    : "Create account"
                  : result.kind === "daily" && isSignedIn
                    ? null
                    : "Home"
              }
              startRound={startSelectedFlow}
              tertiaryActionLabel={
                result.kind === "daily" && !isSignedIn ? "Log in" : undefined
              }
            />
          </>
        ) : null}
      </>
    );
  }
}
