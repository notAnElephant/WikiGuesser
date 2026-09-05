"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import type {
  ActiveRound,
  GuessAttempt,
  MessageAppearance,
  RoundOutcome,
} from "@/src/components/game-shell/types";
import {
  getCategoryMeta,
  getClueUnlockRoundsRemaining,
  getClueIcon,
  getFlagImageUrl,
  getModeMeta,
  renderClueValue,
  renderHiddenCluePlaceholder,
  shouldDisplayGameStatusToast,
} from "@/src/components/game-shell/utils";
import { normalizeGuess } from "@/src/lib/game/answer-matching";
import type {
  GameMode,
  GuessDirection,
  RoundClue,
  SolutionCountryMapData,
} from "@/src/lib/types";
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Ban,
  CircleAlert,
  Eye,
  House,
  LoaderCircle,
  Lock,
  RotateCcw,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  type FormEvent,
  type ReactNode,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import { preload } from "react-dom";
import { toast } from "sonner";

const WorldMapDialog = dynamic(
  () =>
    import("@/src/components/game-shell/world-map-dialog").then(
      (module) => module.WorldMapDialog,
    ),
  { ssr: false },
);

const DIRECTION_META: Record<
  GuessDirection,
  { icon: typeof ArrowUp; label: string }
> = {
  north: { icon: ArrowUp, label: "north" },
  northeast: { icon: ArrowUpRight, label: "northeast" },
  east: { icon: ArrowRight, label: "east" },
  southeast: { icon: ArrowDownRight, label: "southeast" },
  south: { icon: ArrowDown, label: "south" },
  southwest: { icon: ArrowDownLeft, label: "southwest" },
  west: { icon: ArrowLeft, label: "west" },
  northwest: { icon: ArrowUpLeft, label: "northwest" },
};

interface GamePlayViewProps {
  availableCountryOptions: string[];
  canSubmitGuess: boolean;
  clearForCategoryChoice: () => void;
  currentCategory: string | null;
  currentCategoryLabel: string;
  currentClues: RoundClue[];
  currentMode: GameMode | null;
  displayScore: number;
  giveUpRound: () => void;
  flowLabel?: string;
  guess: string;
  guessedEntities: GuessAttempt[];
  guessButtonLabel: string;
  handleGuessSubmit: (event: FormEvent<HTMLFormElement>) => void;
  handleMapGuess: (countryName: string) => void;
  homeButtonLabel?: string;
  isBusy: boolean;
  isCountryRound: boolean;
  message: string;
  messageRevision: number;
  result: RoundOutcome | null;
  revealClue: (clueKey: string) => void;
  revealedCount: number;
  restartButtonLabel?: string;
  round: ActiveRound | null;
  setGuess: (value: string) => void;
  showRestartButton?: boolean;
  startRound: () => void;
  statusAppearance: MessageAppearance;
  validationMessage: string | null;
  view: "round" | "result";
  visibleClassicClues: RoundClue[];
  boardAction?: ReactNode;
  header?: ReactNode;
  showHomeButton?: boolean;
  sideFooter?: ReactNode;
  solutionCountry?: SolutionCountryMapData | null;
}

export function GamePlayView({
  availableCountryOptions,
  canSubmitGuess,
  clearForCategoryChoice,
  currentCategory,
  currentCategoryLabel,
  currentClues,
  currentMode,
  displayScore,
  giveUpRound,
  flowLabel = "Round",
  guess,
  guessedEntities,
  guessButtonLabel,
  handleGuessSubmit,
  handleMapGuess,
  homeButtonLabel = "Categories",
  isBusy,
  isCountryRound,
  message,
  messageRevision,
  result,
  revealClue,
  revealedCount,
  restartButtonLabel = "New round",
  round,
  setGuess,
  showRestartButton = true,
  startRound,
  statusAppearance,
  validationMessage,
  view,
  visibleClassicClues,
  boardAction,
  header,
  showHomeButton = true,
  sideFooter,
  solutionCountry,
}: GamePlayViewProps) {
  const flagImageUrl = getFlagImageUrl(currentClues);

  if (flagImageUrl) {
    preload(flagImageUrl, { as: "image" });
  }

  const currentModeMeta = getModeMeta(currentMode);
  const CurrentCategoryIcon = getCategoryMeta(currentCategory).icon;
  const CurrentModeIcon = currentModeMeta.icon;
  const [isCountryListOpen, setIsCountryListOpen] = useState(false);
  const [mapDrawerState, setMapDrawerState] = useState<
    "hidden" | "medium" | "expanded"
  >("medium");
  const deferredGuess = useDeferredValue(guess);
  const normalizedSearch = normalizeGuess(deferredGuess);
  const matchingCountryOptions = isCountryRound
    ? availableCountryOptions.filter((option) =>
        normalizeGuess(option).includes(normalizedSearch),
      )
    : [];
  const guessedCountries = guessedEntities.flatMap((attempt) =>
    attempt.mapData ? [attempt.mapData] : [],
  );

  useEffect(() => {
    if (!shouldDisplayGameStatusToast(message)) {
      toast.dismiss("game-status");
      return;
    }

    toast[statusAppearance.tone](message, { id: "game-status" });
  }, [message, messageRevision, statusAppearance.tone]);

  useEffect(() => {
    setMapDrawerState("medium");
  }, [round?.roundId]);

  return (
    <div className="grid min-h-[calc(100dvh-1rem)] gap-3 sm:min-h-[calc(100dvh-1.5rem)] sm:gap-5">
      {header}
      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(400px,0.75fr)]">
        <Card
          className="grid content-start gap-2.5 p-3 sm:gap-4 sm:p-5"
          elevation="low"
          padding={0}
        >
          <div className="min-w-0">
            <h1 className="m-0 font-heading text-2xl font-semibold leading-tight tracking-tighter text-primary sm:text-3xl">
              {currentMode === "blurred-lines"
                ? "Choose your clues"
                : "Follow the clues"}
            </h1>
            {currentMode === "blurred-lines" ? (
              <p className="m-0 mt-1 text-xs leading-4 text-secondary sm:mt-2 sm:text-sm">
                Reveal only what you need.
              </p>
            ) : null}
          </div>

          <div
            aria-label={`${revealedCount} of ${currentClues.length || 0} clues revealed`}
            aria-valuemax={currentClues.length || 0}
            aria-valuemin={0}
            aria-valuenow={revealedCount}
            className="grid grid-flow-col auto-cols-fr gap-1.5 py-1 sm:gap-2"
            role="progressbar"
          >
            {currentClues.map((clue) => (
              <span
                aria-hidden="true"
                className={`h-2.5 rounded-full sm:h-2 ${
                  clue.isRevealed
                    ? "bg-accent-bg"
                    : clue.spoilerLevel === "late"
                      ? "bg-muted"
                      : "bg-muted"
                }`}
                key={clue.key}
              />
            ))}
          </div>

          {currentMode === "blurred-lines" ? (
            <div className="overflow-hidden rounded-xl border border-border bg-muted shadow-md  ">
              <table className="w-full border-collapse text-left text-sm text-primary">
                <thead>
                  <tr className="bg-surface text-xs uppercase tracking-wider text-secondary ">
                    <th className="w-[38%] border-b border-r border-border px-4 py-3 font-semibold">
                      Field
                    </th>
                    <th className="border-b border-border px-4 py-3 font-semibold">
                      Reveal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentClues.map((clue, index) => {
                    const unlockRoundsRemaining = round
                      ? getClueUnlockRoundsRemaining(currentClues, clue)
                      : 0;
                    const isLocked = unlockRoundsRemaining > 0;
                    const ClueIcon = getClueIcon(clue.key);

                    return (
                      <tr
                        className={`${index % 2 === 0 ? "bg-surface " : "bg-muted "} ${isLocked ? "opacity-60" : ""}`}
                        key={clue.key}
                      >
                        <th className="border-r border-t border-border px-4 py-3 align-top font-semibold text-primary">
                          <span className="inline-flex items-center gap-2">
                            <ClueIcon
                              aria-hidden="true"
                              className="size-4"
                              strokeWidth={2.1}
                            />
                            <span>{clue.label}</span>
                          </span>
                        </th>
                        <td className="border-t border-border px-4 py-3 align-top">
                          {clue.isRevealed ? (
                            <div className="w-full">
                              <span className="block min-w-0 text-base leading-7 text-primary">
                                {renderClueValue(clue)}
                              </span>
                            </div>
                          ) : round ? (
                            isLocked ? (
                              <div className="flex w-full items-start justify-between gap-3">
                                <span className="min-w-0">
                                  {renderHiddenCluePlaceholder(clue, true)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wider text-secondary ">
                                  <Lock
                                    aria-hidden="true"
                                    className="size-3"
                                    strokeWidth={2.2}
                                  />
                                  {unlockRoundsRemaining}{" "}
                                  {unlockRoundsRemaining === 1
                                    ? "round"
                                    : "rounds"}{" "}
                                  later
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
                                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wider text-secondary transition duration-150 hover:-translate-y-0.5 hover:bg-surface  hover:bg-card"
                                  disabled={isBusy}
                                  onClick={() => revealClue(clue.key)}
                                  type="button"
                                >
                                  <Eye
                                    aria-hidden="true"
                                    className="size-3"
                                    strokeWidth={2.2}
                                  />
                                  Reveal
                                </button>
                              </div>
                            )
                          ) : (
                            <span className="text-base leading-7 text-primary">
                              {renderClueValue(clue)}
                            </span>
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
                    className={`rounded-lg border p-3 sm:rounded-xl sm:p-4 ${
                      index === visibleClassicClues.length - 1 && round
                        ? "border-accent-bg bg-accent-muted"
                        : "border-border bg-card"
                    }`}
                    key={clue.key}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-primary bg-accent-muted sm:size-11 sm:rounded-2xl">
                        <ClueIcon
                          aria-hidden="true"
                          className="size-4 sm:size-5"
                          strokeWidth={2.1}
                        />
                      </span>
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
                          <span className="inline-flex size-5 items-center justify-center rounded-full bg-neutral text-xs">
                            {index + 1}
                          </span>
                          {clue.label}
                        </div>
                        <strong className="mt-1.5 block text-lg leading-tight text-primary sm:mt-2 sm:text-2xl">
                          {renderClueValue(clue)}
                        </strong>
                      </div>
                    </div>
                  </li>
                );
              })}

              {visibleClassicClues.length === 0 ? (
                <li className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border bg-card p-6 text-center ">
                  <div className="grid gap-3">
                    <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-accent-muted">
                      <Sparkles
                        aria-hidden="true"
                        className="size-5 text-primary"
                        strokeWidth={2.1}
                      />
                    </span>
                    <strong className="font-heading text-xl tracking-tight text-primary">
                      First clue coming up
                    </strong>
                  </div>
                </li>
              ) : null}
            </ol>
          )}
          {boardAction}
        </Card>

        <aside className="grid content-start gap-4">
          {isCountryRound &&
          (view === "round" || result?.showDialog === false) ? (
            <WorldMapDialog
              drawerState={mapDrawerState}
              guessedCountries={guessedCountries}
              isExpanded={mapDrawerState === "expanded"}
              onDrawerStateChange={setMapDrawerState}
              onExpandedChange={(isExpanded) =>
                setMapDrawerState(isExpanded ? "expanded" : "medium")
              }
              onCountryGuess={
                round?.canGuess && !isBusy ? handleMapGuess : undefined
              }
              solutionCountry={
                solutionCountry ?? result?.solutionCountry ?? null
              }
            />
          ) : null}

          {round ? (
            <Card
              className={`grid gap-4 p-4 ${isCountryListOpen ? "relative z-[90]" : ""}`}
              elevation="low"
              padding={0}
            >
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                <Target
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2.2}
                />
                Guess
              </div>

              <form className="grid gap-3" onSubmit={handleGuessSubmit}>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-secondary"
                    strokeWidth={2.2}
                  />
                  <input
                    aria-autocomplete={isCountryRound ? "list" : undefined}
                    aria-controls={
                      isCountryRound ? "country-guess-options" : undefined
                    }
                    aria-expanded={
                      isCountryRound ? isCountryListOpen : undefined
                    }
                    aria-label="Submit your entity guess"
                    autoComplete="off"
                    className="w-full rounded-lg border border-border bg-card px-12 py-4 text-primary outline-none transition focus:border-accent-bg focus:ring-2 focus:ring-accent-muted   dark:focus:ring-accent-muted"
                    disabled={isBusy}
                    onBlur={() => setIsCountryListOpen(false)}
                    onChange={(event) => {
                      setGuess(event.target.value);
                      setIsCountryListOpen(true);
                    }}
                    onFocus={() => setIsCountryListOpen(true)}
                    placeholder={
                      isCountryRound ? "Search country" : "Type answer"
                    }
                    type="text"
                    value={guess}
                  />
                  {isCountryRound &&
                  isCountryListOpen &&
                  matchingCountryOptions.length > 0 ? (
                    <div
                      aria-label="Country suggestions"
                      className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 max-h-[min(16rem,40dvh)] touch-pan-y overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface p-1.5 shadow-md "
                      id="country-guess-options"
                      role="listbox"
                    >
                      {matchingCountryOptions.map((option) => (
                        <button
                          className="block w-full rounded-2xl px-3 py-3 text-left text-sm font-medium text-primary hover:bg-accent-bg/8 focus:bg-accent-bg/8 focus:outline-none dark:hover:bg-surface/8 dark:focus:bg-surface/8"
                          key={option}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setGuess(option);
                            setIsCountryListOpen(false);
                          }}
                          role="option"
                          type="button"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {validationMessage ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-warning bg-warning-muted px-3 py-2 text-sm font-medium text-warning">
                    <CircleAlert
                      aria-hidden="true"
                      className="size-4 shrink-0"
                      strokeWidth={2.2}
                    />
                    {validationMessage}
                  </div>
                ) : !round.canGuess ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-secondary">
                    {round.mode === "blurred-lines" ? (
                      <Eye
                        aria-hidden="true"
                        className="size-4 shrink-0"
                        strokeWidth={2.2}
                      />
                    ) : (
                      <Lock
                        aria-hidden="true"
                        className="size-4 shrink-0"
                        strokeWidth={2.2}
                      />
                    )}
                    {round.mode === "blurred-lines"
                      ? "Reveal a row."
                      : "Next miss reveals more."}
                  </div>
                ) : null}

                <Button
                  icon={<ArrowRight aria-hidden="true" />}
                  isDisabled={!canSubmitGuess}
                  isLoading={isBusy}
                  label={guessButtonLabel}
                  type="submit"
                  variant="primary"
                  width="100%"
                />
                <Button
                  icon={<Ban aria-hidden="true" />}
                  isDisabled={isBusy}
                  label="Give up"
                  onClick={giveUpRound}
                  variant="secondary"
                  width="100%"
                />
              </form>

              {guessedEntities.length > 0 ? (
                <div className="grid gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
                    Tried
                  </div>
                  <ol className="grid gap-2">
                    {guessedEntities.map((attempt) => {
                      const directionMeta = attempt.direction
                        ? DIRECTION_META[attempt.direction]
                        : null;
                      const DirectionIcon = directionMeta?.icon;

                      return (
                        <li
                          className="flex items-center justify-between gap-3 rounded-lg border border-error bg-error-muted text-error"
                          key={attempt.name}
                        >
                          <span>{attempt.name}</span>
                          {DirectionIcon && directionMeta ? (
                            <span
                              aria-label={`The goal country is ${directionMeta.label} of ${attempt.name}`}
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-card text-error shadow-sm "
                              title={`Goal is ${directionMeta.label}`}
                            >
                              <DirectionIcon
                                aria-hidden="true"
                                className="size-4.5"
                                strokeWidth={2.5}
                              />
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : null}
            </Card>
          ) : null}

          {sideFooter}

          {showRestartButton || showHomeButton ? (
            <Card className="grid gap-3" elevation="low" padding={4}>
              {showRestartButton ? (
                <Button
                  icon={<RotateCcw aria-hidden="true" />}
                  isDisabled={isBusy}
                  label={restartButtonLabel}
                  onClick={startRound}
                  variant="secondary"
                  width="100%"
                />
              ) : null}
              {showHomeButton ? (
                <Button
                  icon={<House aria-hidden="true" />}
                  isDisabled={isBusy}
                  label={homeButtonLabel}
                  onClick={clearForCategoryChoice}
                  variant="secondary"
                  width="100%"
                />
              ) : null}
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
