"use client";

import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";
import { Text } from "@astryxdesign/core/Text";
import { getScoreForGuess } from "@/src/lib/game/round-rules";
import { Card } from "@astryxdesign/core/Card";
import type {
  ActiveRound,
  GuessAttempt,
  MessageAppearance,
  RoundOutcome,
} from "@/src/components/game-shell/types";
import {
  getClueUnlockRoundsRemaining,
  getClueIcon,
  getFlagImageUrl,
  getModeMeta,
  renderClueValue,
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
  useRef,
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
  const isRevealMode = currentMode === "blurred-lines";
  const isRevealStep = Boolean(round && isRevealMode && !round.canGuess);
  const isGuessStep = Boolean(round && isRevealMode && round.canGuess);
  const [isCountryListOpen, setIsCountryListOpen] = useState(false);
  const [mapDrawerState, setMapDrawerState] = useState<
    "hidden" | "medium" | "expanded"
  >("hidden");
  const normalizedSearch = normalizeGuess(guess);
  const [activeOption, setActiveOption] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingExit, setPendingExit] = useState<
    "give-up" | "restart" | "home" | null
  >(null);
  const [pendingMapGuess, setPendingMapGuess] = useState<string | null>(null);
  const potentialScore = round
    ? getScoreForGuess(revealedCount + (isRevealStep ? 1 : 0))
    : displayScore;
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
    window.scrollTo({ top: 0, behavior: "instant" });
    setMapDrawerState(
      window.matchMedia("(min-width: 1024px)").matches ? "medium" : "hidden",
    );
    setIsCountryListOpen(false);
    setActiveOption(-1);
    setPendingMapGuess(null);
    setPendingExit(null);
  }, [round?.roundId]);

  useEffect(() => {
    if (isBusy) return;
    if (isGuessStep) {
      inputRef.current?.focus({ preventScroll: true });
      if (!window.matchMedia("(min-width: 1024px)").matches) {
        inputRef.current?.scrollIntoView({
          block: "center",
          behavior: "instant",
        });
      }
    } else if (isRevealStep) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [isGuessStep, isRevealStep, isBusy]);

  function requestExit(action: "give-up" | "restart" | "home") {
    if (round) setPendingExit(action);
    else if (action === "restart") startRound();
    else if (action === "home") clearForCategoryChoice();
  }

  function selectCountry(option: string) {
    setGuess(option);
    setIsCountryListOpen(false);
    setActiveOption(-1);
    inputRef.current?.focus();
  }

  return (
    <VStack gap={4}>
      <HStack gap={3} wrap="wrap" justify="between" className="text-sm">
        <Text weight="semibold">
          {flowLabel} · {currentModeMeta.label} · {currentCategoryLabel}
        </Text>
        <Text color="accent" weight="semibold">
          {round ? "Available score" : "Score"}: {potentialScore} pts ·{" "}
          {revealedCount}/{currentClues.length} clues
        </Text>
      </HStack>
      {header}
      <Grid columns={{ minWidth: 480, max: 2 }} gap={4} align="start">
        <Card
          className="grid content-start gap-2.5 p-3 sm:gap-4 sm:p-5"
          elevation="low"
          padding={0}
        >
          <div className="min-w-0">
            <h1 className="m-0 font-heading text-2xl font-semibold leading-tight tracking-tighter text-primary sm:text-3xl">
              {view === "result"
                ? "Round complete"
                : isRevealMode
                  ? isGuessStep
                    ? "Make your guess"
                    : "Choose a clue"
                  : "Follow the clues"}
            </h1>
            {isRevealMode && round ? (
              <p className="m-0 mt-1 text-xs leading-4 text-secondary sm:mt-2 sm:text-sm">
                {isGuessStep
                  ? "Use the revealed clues to make your best guess."
                  : "Reveal only what you need, then make one guess."}
              </p>
            ) : null}
          </div>

          {isRevealMode && round ? (
            <div
              aria-label={`Current step: ${isGuessStep ? "guess" : "reveal a clue"}`}
              className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card text-xs font-semibold uppercase tracking-wider"
            >
              <span
                className={`flex items-center gap-2 px-3 py-2.5 sm:px-4 ${isRevealStep ? "bg-accent-muted text-accent shadow-sm" : "text-secondary"}`}
              >
                <span
                  className={`inline-flex size-5 items-center justify-center rounded-full text-xs ${isRevealStep ? "bg-accent-bg text-on-accent" : "bg-muted text-secondary"}`}
                >
                  1
                </span>
                Reveal
              </span>
              <span
                className={`flex items-center gap-2 border-l border-border px-3 py-2.5 sm:px-4 ${isGuessStep ? "bg-accent-muted text-accent shadow-sm" : "text-secondary"}`}
              >
                <span
                  className={`inline-flex size-5 items-center justify-center rounded-full text-xs ${isGuessStep ? "bg-accent-bg text-on-accent" : "bg-muted text-secondary"}`}
                >
                  2
                </span>
                Guess
              </span>
            </div>
          ) : null}

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
            <div
              className={`overflow-hidden rounded-xl border border-border bg-muted shadow-md ${isRevealStep ? "outline-2 outline-offset-2 outline-accent-bg" : ""}`}
            >
              <table className="w-full border-collapse text-left text-sm text-primary">
                <thead>
                  <tr className="bg-surface text-xs uppercase tracking-wider text-secondary ">
                    <th className="w-2/5 border-b border-r border-border px-3 py-3 font-semibold">
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
                        className={index % 2 === 0 ? "bg-surface" : "bg-muted"}
                        key={clue.key}
                      >
                        <th className="border-r border-t border-border px-3 py-3 align-middle font-semibold text-primary">
                          <span className="inline-flex items-center gap-2">
                            <ClueIcon
                              aria-hidden="true"
                              className="size-4"
                              strokeWidth={2.1}
                            />
                            <span>{clue.label}</span>
                          </span>
                        </th>
                        <td className="border-t border-border px-3 py-2 align-middle">
                          {clue.isRevealed ? (
                            <div className="w-full">
                              <span className="block min-w-0 text-base leading-7 text-primary">
                                {renderClueValue(clue)}
                              </span>
                            </div>
                          ) : round ? (
                            isLocked ? (
                              <Text type="supporting">
                                Reveal {unlockRoundsRemaining} more{" "}
                                {unlockRoundsRemaining === 1 ? "clue" : "clues"}{" "}
                                to unlock
                              </Text>
                            ) : isRevealStep ? (
                              <Button
                                label={`Reveal ${clue.label}`}
                                icon={<Eye aria-hidden="true" />}
                                variant="secondary"
                                size="sm"
                                className="min-h-11 sm:min-h-0"
                                width="100%"
                                isDisabled={isBusy}
                                onClick={() => revealClue(clue.key)}
                              >
                                Reveal
                              </Button>
                            ) : (
                              <Text type="supporting">Guess first</Text>
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

        <VStack as="aside" gap={4}>
          {round ? (
            <Card
              className={`grid gap-4 p-4 ${isGuessStep ? "outline-2 outline-offset-2 outline-accent-bg" : ""}`}
              elevation="low"
              padding={0}
            >
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                <Target
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2.2}
                />
                {isRevealMode
                  ? isGuessStep
                    ? "Next: make your guess"
                    : "Next: reveal a clue"
                  : "Guess"}
              </div>

              {isRevealStep ? (
                <div className="grid gap-3">
                  <div className="rounded-xl border border-accent-bg bg-accent-muted p-3 text-sm leading-5 text-primary">
                    Choose any unlocked clue in the board. Your guess opens as
                    soon as you reveal it.
                  </div>
                  <Button
                    className="min-h-11 sm:min-h-0"
                    icon={<Ban aria-hidden="true" />}
                    isDisabled={isBusy}
                    label="Give up"
                    onClick={() => requestExit("give-up")}
                    variant="ghost"
                    width="100%"
                  />
                </div>
              ) : (
                <form className="grid gap-3" onSubmit={handleGuessSubmit}>
                  <VStack gap={2}>
                    <HStack className="relative">
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
                        aria-describedby={
                          validationMessage
                            ? "guess-validation-message"
                            : undefined
                        }
                        aria-expanded={
                          isCountryRound ? isCountryListOpen : undefined
                        }
                        aria-invalid={validationMessage ? true : undefined}
                        aria-label={
                          isCountryRound ? "Search country" : "Type answer"
                        }
                        role={isCountryRound ? "combobox" : undefined}
                        ref={inputRef}
                        aria-activedescendant={
                          isCountryRound &&
                          isCountryListOpen &&
                          activeOption >= 0
                            ? `country-option-${activeOption}`
                            : undefined
                        }
                        onKeyDown={(event) => {
                          if (!isCountryRound || event.nativeEvent.isComposing)
                            return;
                          if (
                            event.key === "ArrowDown" ||
                            event.key === "ArrowUp"
                          ) {
                            event.preventDefault();
                            setIsCountryListOpen(true);
                            const count = matchingCountryOptions.length;
                            const next = count
                              ? event.key === "ArrowDown"
                                ? (activeOption + 1) % count
                                : activeOption <= 0
                                  ? count - 1
                                  : activeOption - 1
                              : -1;
                            setActiveOption(next);
                            requestAnimationFrame(() =>
                              document
                                .getElementById(`country-option-${next}`)
                                ?.scrollIntoView({ block: "nearest" }),
                            );
                          } else if (event.key === "Escape") {
                            event.preventDefault();
                            setIsCountryListOpen(false);
                            setActiveOption(-1);
                          } else if (
                            event.key === "Enter" &&
                            isCountryListOpen &&
                            activeOption >= 0 &&
                            matchingCountryOptions[activeOption]
                          ) {
                            event.preventDefault();
                            selectCountry(matchingCountryOptions[activeOption]);
                          } else if (event.key === "Enter") {
                            setIsCountryListOpen(false);
                          }
                        }}
                        autoComplete="off"
                        className="w-full rounded-lg border border-border bg-card px-12 py-4 text-primary outline-none transition focus:border-accent-bg focus:ring-2 focus:ring-accent-muted   dark:focus:ring-accent-muted"
                        disabled={isBusy}
                        onBlur={() => {
                          setIsCountryListOpen(false);
                          setActiveOption(-1);
                        }}
                        onChange={(event) => {
                          setGuess(event.target.value);
                          setActiveOption(-1);
                          setIsCountryListOpen(true);
                        }}
                        onFocus={() => setIsCountryListOpen(true)}
                        placeholder={
                          isCountryRound ? "Search country" : "Type answer"
                        }
                        type="text"
                        value={guess}
                      />
                    </HStack>
                    {isCountryRound &&
                    isCountryListOpen &&
                    matchingCountryOptions.length > 0 ? (
                      <VStack
                        aria-label="Country suggestions"
                        className="max-h-48 touch-pan-y overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface p-1.5"
                        id="country-guess-options"
                        role="listbox"
                      >
                        {matchingCountryOptions.map((option, index) => (
                          <button
                            className="block w-full rounded-2xl px-3 py-3 text-left text-sm font-medium text-primary hover:bg-accent-muted aria-selected:bg-accent-muted focus:outline-none"
                            id={`country-option-${index}`}
                            aria-selected={activeOption === index}
                            tabIndex={-1}
                            key={option}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectCountry(option)}
                            role="option"
                            type="button"
                          >
                            {option}
                          </button>
                        ))}
                      </VStack>
                    ) : isCountryRound && isCountryListOpen && guess.trim() ? (
                      <Text color="secondary">
                        No matching countries. Try another name.
                      </Text>
                    ) : null}
                  </VStack>

                  {validationMessage ? (
                    <div
                      aria-live="polite"
                      className="inline-flex items-center gap-2 rounded-full border border-warning bg-warning-muted px-3 py-2 text-sm font-medium text-warning"
                      id="guess-validation-message"
                    >
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
                    className="min-h-11 sm:min-h-0"
                    icon={<ArrowRight aria-hidden="true" />}
                    isDisabled={!canSubmitGuess}
                    isLoading={isBusy}
                    label={isRevealMode ? "Submit guess" : guessButtonLabel}
                    onMouseDown={(event) => event.preventDefault()}
                    type="submit"
                    variant="primary"
                    width="100%"
                  />
                  <Button
                    className="min-h-11 sm:min-h-0"
                    icon={<Ban aria-hidden="true" />}
                    isDisabled={isBusy}
                    label="Give up"
                    onClick={() => requestExit("give-up")}
                    variant="ghost"
                    width="100%"
                  />
                </form>
              )}

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
                          className="flex items-center justify-between gap-3 border-b border-border px-2 py-2 text-primary"
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

          {isCountryRound &&
          (view === "round" || result?.showDialog === false) ? (
            <WorldMapDialog
              countryOptions={availableCountryOptions}
              drawerState={mapDrawerState}
              guessedCountries={guessedCountries}
              isActive={isGuessStep}
              isExpanded={mapDrawerState === "expanded"}
              onDrawerStateChange={setMapDrawerState}
              onExpandedChange={(isExpanded) =>
                setMapDrawerState(isExpanded ? "expanded" : "medium")
              }
              onCountryGuess={
                round?.canGuess && !isBusy
                  ? (country) => {
                      setMapDrawerState(
                        window.matchMedia("(min-width: 1024px)").matches
                          ? "medium"
                          : "hidden",
                      );
                      setPendingMapGuess(country);
                    }
                  : undefined
              }
              solutionCountry={
                solutionCountry ?? result?.solutionCountry ?? null
              }
            />
          ) : null}

          {sideFooter}

          {showRestartButton || showHomeButton ? (
            <HStack gap={2} wrap="wrap" justify="center">
              {showRestartButton ? (
                <Button
                  className="min-h-11 sm:min-h-0"
                  icon={<RotateCcw aria-hidden="true" />}
                  isDisabled={isBusy}
                  label={restartButtonLabel}
                  onClick={() => requestExit("restart")}
                  variant="ghost"
                />
              ) : null}
              {showHomeButton ? (
                <Button
                  className="min-h-11 sm:min-h-0"
                  icon={<House aria-hidden="true" />}
                  isDisabled={isBusy}
                  label={homeButtonLabel}
                  onClick={() => requestExit("home")}
                  variant="ghost"
                />
              ) : null}
            </HStack>
          ) : null}
        </VStack>
      </Grid>
      {pendingExit ? (
        <Dialog isOpen onOpenChange={() => setPendingExit(null)} padding={5}>
          <DialogHeader
            title={
              pendingExit === "give-up"
                ? "Give up this round?"
                : "Leave this round?"
            }
            onOpenChange={() => setPendingExit(null)}
          />
          <VStack gap={4}>
            <Text>
              {pendingExit === "give-up"
                ? "The answer will be revealed and this round will score 0 points."
                : "Your progress in this round will be lost."}
            </Text>
            <Button
              label="Keep playing"
              variant="primary"
              onClick={() => setPendingExit(null)}
            />
            <Button
              label={
                pendingExit === "give-up"
                  ? "Reveal answer"
                  : pendingExit === "restart"
                    ? "Start new round"
                    : "Leave round"
              }
              variant="secondary"
              onClick={() => {
                const action = pendingExit;
                setPendingExit(null);
                if (action === "give-up") giveUpRound();
                else if (action === "restart") startRound();
                else clearForCategoryChoice();
              }}
            />
          </VStack>
        </Dialog>
      ) : null}
      {pendingMapGuess ? (
        <Dialog
          isOpen
          onOpenChange={() => setPendingMapGuess(null)}
          padding={5}
        >
          <DialogHeader
            title={`Guess ${pendingMapGuess}?`}
            onOpenChange={() => setPendingMapGuess(null)}
          />
          <VStack gap={4}>
            <Text>
              A correct map guess earns {Math.floor(potentialScore / 2)} points
              — half the {potentialScore} points for a typed answer.
            </Text>
            <Button
              label={`Confirm ${pendingMapGuess}`}
              variant="primary"
              isDisabled={isBusy}
              onClick={() => {
                const country = pendingMapGuess;
                setPendingMapGuess(null);
                if (!window.matchMedia("(min-width: 1024px)").matches)
                  setMapDrawerState("hidden");
                handleMapGuess(country);
              }}
            />
            <Button
              label="Cancel"
              variant="ghost"
              onClick={() => setPendingMapGuess(null)}
            />
          </VStack>
        </Dialog>
      ) : null}
    </VStack>
  );
}
