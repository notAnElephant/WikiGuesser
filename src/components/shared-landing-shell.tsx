"use client";

import { GoogleOneTap } from "@clerk/nextjs";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import {
  createStaticSource,
  Typeahead,
  type SearchableItem,
} from "@astryxdesign/core/Typeahead";
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
  ShieldCheck,
  X,
} from "lucide-react";

import { DuelCreator } from "@/src/components/duel/duel-creator";
import { OfflinePackStatus } from "@/src/components/offline-pack-status";
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
import { getActiveOfflineCountryPack } from "@/src/lib/offline";
import {
  findOtherAvailableDaily,
  getDailyComboKey,
} from "@/src/lib/game/daily";
import {
  getGameModeHref,
  type GameRouteTarget,
} from "@/src/lib/game/game-routes";
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
  initialGame?: GameRouteTarget;
  isAdmin: boolean;
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
    freeDescription: "Each miss reveals the next clue.",
    freeTitle: "Classic",
  },
  "blurred-lines": {
    dailyDescription: "Choose a clue, then make a guess.",
    dailyTitle: "Choose Clues Daily",
    freeDescription: "Choose a clue, then make a guess.",
    freeTitle: "Choose Clues",
  },
};

interface GameLauncherProps {
  claimBanner: string | null;
  continentOptions: ContinentOption[];
  countryOptions: string[];
  dailyOptions: DailyChallengeOption[];
  isBusy: boolean;
  isClaimingPending: boolean;
  isAdmin: boolean;
  onChooseFreePlay: (mode: GameMode) => void;
  onStartAdminTest: (country: string, mode: GameMode) => void;
  onStartDaily: (option: DailyChallengeOption) => void;
  onStartFreePlay: (mode: GameMode, continent: ContinentId | null) => void;
  resetCountdown: string;
  selectedContinent: ContinentId | null;
  totalCountryCount: number;
}

export function GameLauncher({
  claimBanner,
  continentOptions,
  countryOptions,
  dailyOptions,
  isBusy,
  isClaimingPending,
  isAdmin,
  onChooseFreePlay,
  onStartAdminTest,
  onStartDaily,
  onStartFreePlay,
  resetCountdown,
  selectedContinent,
  totalCountryCount,
}: GameLauncherProps) {
  const [pendingFreePlayMode, setPendingFreePlayMode] =
    useState<GameMode | null>(null);
  const [isAdminTestOpen, setIsAdminTestOpen] = useState(false);

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
      <VStack gap={2}>
        <Text>
          Guess the country from its clues. Fewer clues earn more points.
        </Text>
        <details className="text-sm text-secondary">
          <summary className="cursor-pointer py-2 font-semibold text-accent">
            How to play
          </summary>
          <VStack gap={2} paddingBlock={2}>
            <Text>
              Classic: start with one clue. Each wrong guess reveals the next.
            </Text>
            <Text>
              Choose Clues: reveal an unlocked clue, then make one guess. After
              a miss, choose another clue.
            </Text>
            <Text>
              A correct answer earns 100, 80, 60, 40, 20, or 10 points as more
              clues are revealed. Map guesses earn half points. Giving up earns
              0.
            </Text>
            <Text>
              Play each daily puzzle once, or practise with unlimited free play.
            </Text>
          </VStack>
        </details>
      </VStack>

      {claimBanner ? (
        <div className="rounded-2xl border border-success bg-success-muted px-4 py-3 text-sm font-medium text-success">
          {claimBanner}
        </div>
      ) : null}

      <div className="grid gap-4">
        <LauncherBand
          description="Two daily puzzles. One country each."
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
              onClick={() => {
                setPendingFreePlayMode(mode.id);
                onChooseFreePlay(mode.id);
              }}
              title={launcherModeCopy[mode.id].freeTitle}
              variant="secondary"
            />
          ))}
        </LauncherBand>

        {isAdmin ? (
          <LauncherBand
            description="Start a chosen country in either game mode. Visible only to admins."
            title="Admin test"
          >
            <LauncherRow
              actionLabel="Choose country"
              description="Reproduce a country-specific issue."
              disabled={isBusy}
              icon={ShieldCheck}
              onClick={() => setIsAdminTestOpen(true)}
              title="Test a country"
              variant="secondary"
            />
          </LauncherBand>
        ) : null}
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
      {isAdminTestOpen ? (
        <AdminTestRoundDialog
          countryOptions={countryOptions}
          isBusy={isBusy}
          onClose={() => setIsAdminTestOpen(false)}
          onStart={(country, mode) => {
            setIsAdminTestOpen(false);
            onStartAdminTest(country, mode);
          }}
        />
      ) : null}
    </section>
  );
}

interface AdminTestRoundDialogProps {
  countryOptions: string[];
  isBusy: boolean;
  onClose: () => void;
  onStart: (country: string, mode: GameMode) => void;
}

function AdminTestRoundDialog({
  countryOptions,
  isBusy,
  onClose,
  onStart,
}: AdminTestRoundDialogProps) {
  const [country, setCountry] = useState<SearchableItem | null>(null);
  const [mode, setMode] = useState<GameMode>("classic");
  const countrySource = useMemo(
    () =>
      createStaticSource(
        countryOptions.map((option) => ({ id: option, label: option })),
      ),
    [countryOptions],
  );

  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      padding={6}
      purpose="form"
      width="32rem"
    >
      <DialogHeader
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
        startContent={
          <ShieldCheck aria-hidden="true" className="text-accent" />
        }
        subtitle="This bypasses normal random country selection."
        title="Start an admin test round"
      />
      <VStack gap={4} paddingBlock={4}>
        <Typeahead
          hasAutoFocus
          hasEntriesOnFocus
          label="Country"
          maxMenuItems={12}
          onChange={setCountry}
          placeholder="Search countries"
          searchSource={countrySource}
          value={country}
          width="100%"
        />
        <VStack gap={2}>
          <Text weight="semibold">Game mode</Text>
          <HStack gap={2} wrap="wrap">
            {GAME_MODE_OPTIONS.map((option) => (
              <Button
                key={option.id}
                label={`Select ${launcherModeCopy[option.id].freeTitle} mode`}
                onClick={() => setMode(option.id)}
                variant={mode === option.id ? "primary" : "secondary"}
              >
                {launcherModeCopy[option.id].freeTitle}
              </Button>
            ))}
          </HStack>
        </VStack>
        <HStack gap={2} justify="end">
          <Button
            label="Cancel admin test"
            onClick={onClose}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            isDisabled={!country || isBusy}
            label="Start admin test"
            onClick={() => {
              if (country) onStart(country.label, mode);
            }}
          >
            Start test
          </Button>
        </HStack>
      </VStack>
    </Dialog>
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

export function ContinentPickerDialog({
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

function FreePlaySetupView({ mode }: { mode: GameMode }) {
  const modeMeta = getModeMeta(mode);

  return (
    <VStack as="main" gap={4}>
      <HStack gap={3} justify="between" wrap="wrap">
        <Text weight="semibold">Free play · {modeMeta.label} · Countries</Text>
        <Text color="accent" weight="semibold">
          Available score: 100 pts · 0/6 clues
        </Text>
      </HStack>
      <Card elevation="low" padding={5}>
        <VStack gap={2}>
          <h1 className="m-0 font-heading text-2xl font-semibold leading-tight tracking-tighter text-primary sm:text-3xl">
            {mode === "blurred-lines" ? "Choose a clue" : "Follow the clues"}
          </h1>
          <Text color="secondary">
            Choose a continent to prepare your next round.
          </Text>
        </VStack>
      </Card>
    </VStack>
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
        <div className="flex flex-col justify-center border-b border-border p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <span className="mb-4 hidden size-12 items-center justify-center rounded-md border border-border bg-surface text-accent lg:inline-flex">
            <BandIcon aria-hidden="true" className="size-5" strokeWidth={1.9} />
          </span>
          <h2 className="m-0 font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-primary">
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
    <div className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:py-5">
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
  initialGame,
  isAdmin,
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
  const [isAdminTestRound, setIsAdminTestRound] = useState(false);
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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isDirectFreePlayPickerOpen, setIsDirectFreePlayPickerOpen] =
    useState(true);
  const [playedOverrides, setPlayedOverrides] = useState<
    Record<string, PlayedOverride>
  >({});
  const autoStartedRouteRef = useRef<string | null>(null);

  function setMessage(nextMessage: string) {
    setMessageState(nextMessage);
    setMessageRevision((current) => current + 1);
  }

  function pushGameUrl(kind: "daily" | "play", mode: GameMode) {
    window.history.pushState(null, "", getGameModeHref(kind, mode));
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
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

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

  function clearToHome() {
    setRound(null);
    setResult(null);
    setGuess("");
    setGuessedEntities([]);
    setScore(null);
    setIsSyncingReveal(false);
    setIsAdminTestRound(false);

    router.push("/");
  }

  function startFreePlay(
    mode: GameMode = selectedMode ?? "classic",
    continent: ContinentId | null = selectedContinent,
    onFailure?: () => void,
  ) {
    if (!defaultFreePlayCategory) {
      setMessage("Free play unavailable.");
      onFailure?.();
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
    setIsAdminTestRound(false);

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
          onFailure?.();
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
        setRound({ ...payload, playOrigin: "server" });
        setMessage(
          payload.mode === "blurred-lines" ? "Tap a row." : "Round live.",
        );
      } catch {
        const offlinePack = await getActiveOfflineCountryPack().catch(
          () => null,
        );

        if (offlinePack) {
          const params = new URLSearchParams({ mode });
          if (continent) params.set("continent", continent);
          router.push(`/offline?${params.toString()}`);
          return;
        }

        setMessage("Round failed. Retry.");
        onFailure?.();
      }
    });
  }

  function startAdminTestRound(country: string, mode: GameMode) {
    setSelectedPlayType("free-play");
    setSelectedCategory("countries");
    setSelectedMode(mode);
    setSelectedContinent(null);
    setGuess("");
    setGuessedEntities([]);
    setScore(null);
    setResult(null);
    setIsSyncingReveal(false);
    setIsAdminTestRound(true);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/rounds/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country, mode }),
        });
        const payload = (await response.json()) as StartRoundResult & {
          error?: string;
        };

        if (!response.ok) {
          setMessage(payload.error ?? "Test round failed. Retry.");
          return;
        }

        setRound({ ...payload, playOrigin: "server" });
        setMessage(
          payload.mode === "blurred-lines"
            ? "Admin test live. Tap a row."
            : "Admin test live.",
        );
      } catch {
        setMessage("Test round failed. Retry.");
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
    setIsAdminTestRound(false);

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
      setRound({ ...payload, playOrigin: "server" });
      setMessage(
        payload.mode === "blurred-lines" ? "Tap a row." : "Daily live.",
      );
    });
  }

  useEffect(() => {
    if (!initialGame || initialGame.kind !== "daily") {
      autoStartedRouteRef.current = null;
      return;
    }

    const routeKey = `${initialGame.kind}:${initialGame.mode}`;

    if (autoStartedRouteRef.current === routeKey) {
      return;
    }

    autoStartedRouteRef.current = routeKey;
    const option = dailyOptions.find(
      (candidate) =>
        candidate.category === dailyData.defaultCategory &&
        candidate.mode === initialGame.mode,
    );

    void startDaily(option ?? null);
  }, [dailyData.defaultCategory, dailyOptions, initialGame]);

  function startSelectedFlow() {
    if (selectedPlayType === "daily") {
      void startDaily(selectedDailyOption);
      return;
    }

    void startFreePlay(selectedMode ?? "classic");
  }

  function revealClue(clueKey: string) {
    if (!round || round.playOrigin !== "server" || isSyncingReveal) {
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
        setRound({ ...payload, playOrigin: "server" });
        setMessage(
          payload.remainingClues === 0 ? "Last clue." : "Clue unlocked.",
        );
      } catch {
        setRound(previousRound);
        setMessage("Connection lost. Reconnect to continue this online round.");
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

    if (!round || round.playOrigin !== "server" || !guessValue) {
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
            playOrigin: "server",
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
            playOrigin: "server",
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
          playOrigin: "server",
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
      } catch {
        setMessage("Connection lost. Reconnect to continue this online round.");
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
    if (!round || round.playOrigin !== "server") {
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
          playOrigin: "server",
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
    if (initialGame?.kind === "play") {
      return (
        <>
          <FreePlaySetupView mode={initialGame.mode} />
          {isDirectFreePlayPickerOpen ? (
            <ContinentPickerDialog
              continentOptions={continentOptions}
              mode={initialGame.mode}
              onClose={() => {
                setIsDirectFreePlayPickerOpen(false);
                clearToHome();
              }}
              onSelect={(continent) => {
                setIsDirectFreePlayPickerOpen(false);
                void startFreePlay(initialGame.mode, continent, () =>
                  setIsDirectFreePlayPickerOpen(true),
                );
              }}
              selectedContinent={selectedContinent}
              totalCountryCount={countryOptions.length}
            />
          ) : null}
        </>
      );
    }

    return (
      <div className="grid gap-6">
        <OfflinePackStatus />
        <GameLauncher
          claimBanner={claimBanner}
          continentOptions={continentOptions}
          countryOptions={countryOptions}
          dailyOptions={dailyOptions.filter(
            (option) => option.category === dailyData.defaultCategory,
          )}
          isBusy={isBusy}
          isClaimingPending={isClaimingPending}
          isAdmin={isAdmin}
          onChooseFreePlay={(mode) => pushGameUrl("play", mode)}
          onStartAdminTest={(country, mode) =>
            void startAdminTestRound(country, mode)
          }
          onStartDaily={(option) => {
            pushGameUrl("daily", option.mode);
            void startDaily(option);
          }}
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
            isAdminTestRound
              ? "Admin test"
              : isDailyFlow
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
        !prefersReducedMotion &&
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
                  pushGameUrl("daily", otherAvailableDailyOption.mode);
                  void startDaily(otherAvailableDailyOption);
                  return;
                }

                if (!isSignedIn) {
                  router.push("/sign-up");
                  return;
                }

                clearToHome();
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

                result.kind === "daily" ? clearToHome() : clearToHome();
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
              statsHref={isSignedIn ? "/stats" : undefined}
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
