"use client";

import { FieldLabel } from "@astryxdesign/core/Field";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { VStack } from "@astryxdesign/core/VStack";
import { Text } from "@astryxdesign/core/Text";
import { List, ListItem } from "@astryxdesign/core/List";
import { useAppToast } from "@/src/components/app-toaster";
import { usePlayViewport } from "@/src/components/game-shell/use-play-viewport";
import { getScoreForGuess } from "@/src/lib/game/round-rules";
import { normalizeGuess } from "@/src/lib/game/answer-matching";
import {
  getClueUnlockRoundsRemaining,
  getFlagImageUrl,
  getModeMeta,
  renderClueValue,
  shouldDisplayGameStatusToast,
} from "@/src/components/game-shell/utils";
import type {
  ActiveRound,
  GuessAttempt,
  MessageAppearance,
  RoundOutcome,
} from "@/src/components/game-shell/types";
import type {
  GameMode,
  RoundClue,
  SolutionCountryMapData,
} from "@/src/lib/types";
import {
  Ban,
  ChevronDown,
  ChevronUp,
  Eye,
  GripHorizontal,
  House,
  MoreHorizontal,
  RotateCcw,
  Search,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  type FormEvent,
  type ReactNode,
  useRef,
  useEffect,
  useState,
  useId,
} from "react";
import { preload } from "react-dom";

const WorldMapDialog = dynamic(
  () =>
    import("@/src/components/game-shell/world-map-dialog").then(
      (module) => module.WorldMapDialog,
    ),
  { ssr: false },
);

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
  currentCategoryLabel,
  currentClues,
  currentMode,
  displayScore,
  giveUpRound,
  flowLabel = "Round",
  guess,
  guessedEntities,
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
  const toast = useAppToast();
  const frameRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clueScrollRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const didDrag = useRef(false);
  const [isTyping, setIsTyping] = useState(false);
  const { isMobile, height, visibleHeight } = usePlayViewport(
    frameRef,
    isCountryRound,
    isTyping,
  );
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [showCluesWhileTyping, setShowCluesWhileTyping] = useState(false);
  const [isCountryListOpen, setIsCountryListOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(-1);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [pendingExit, setPendingExit] = useState<
    "give-up" | "restart" | "home" | null
  >(null);
  const id = useId();
  const inputId = `${id}-guess`;
  const optionsId = `${id}-countries`;
  const cluesId = `${id}-clues`;
  const validationId = `${id}-validation`;
  const flagImageUrl = getFlagImageUrl(currentClues);
  if (flagImageUrl) preload(flagImageUrl, { as: "image" });

  const isRevealMode = currentMode === "blurred-lines";
  const isRevealStep = Boolean(round && isRevealMode && !round.canGuess);
  const potentialScore = round
    ? getScoreForGuess(revealedCount + (isRevealStep ? 1 : 0))
    : displayScore;
  const hasCountrySearch = normalizeGuess(guess).length > 0;
  const matchingCountries =
    isCountryRound && hasCountrySearch
      ? availableCountryOptions.filter((option) =>
          normalizeGuess(option).includes(normalizeGuess(guess)),
        )
      : [];
  const suggestionsOpen = isCountryListOpen && hasCountrySearch;
  const mobileMap = isMobile && isCountryRound;
  const compactSheet = mobileMap && isTyping && !showCluesWhileTyping;
  const shownClues = isRevealMode ? currentClues : visibleClassicClues;
  const sheetHeight = mobileMap
    ? compactSheet
      ? visibleHeight < 500
        ? "min(64%, calc(var(--spacing-10) * 4))"
        : "min(46%, calc(var(--spacing-10) * 4))"
      : sheetExpanded || showCluesWhileTyping
        ? "64%"
        : `${Math.min(48, 33 + shownClues.length * 5)}%`
    : undefined;
  // On a short keyboard viewport, reclaim navigation space for the map.
  const compactViewport = mobileMap && isTyping && visibleHeight < 500;
  const latestClue = currentClues
    .filter((clue) => clue.isRevealed && clue.key !== "flag-colors")
    .at(-1);
  const guessedCountries = guessedEntities.flatMap((attempt) =>
    attempt.mapData ? [attempt.mapData] : [],
  );

  useEffect(() => {
    if (!shouldDisplayGameStatusToast(message)) {
      toast.dismiss("game-status");
      return;
    }
    toast[statusAppearance.tone](message, { id: "game-status" });
  }, [message, messageRevision, statusAppearance.tone, toast]);

  useEffect(() => {
    setSheetExpanded(false);
    setShowCluesWhileTyping(false);
    setIsCountryListOpen(false);
    setActiveOption(-1);
    setPendingExit(null);
    setActionsOpen(false);
    setIsMapExpanded(false);
    inputRef.current?.blur();
  }, [round?.roundId]);

  useEffect(() => {
    // Keep the newly revealed classic clue in view without scrolling the map away.
    if (!isRevealMode) {
      clueScrollRef.current?.scrollTo({
        top: clueScrollRef.current.scrollHeight,
      });
    }
  }, [revealedCount, isRevealMode]);

  useEffect(() => {
    if (isMobile) setIsMapExpanded(false);
  }, [isMobile]);

  function requestExit(action: "give-up" | "restart" | "home") {
    setActionsOpen(false);
    if (round) setPendingExit(action);
    else if (action === "restart") startRound();
    else if (action === "home") clearForCategoryChoice();
  }

  function selectCountry(country: string) {
    setGuess(country);
    setIsCountryListOpen(false);
    setActiveOption(-1);
    inputRef.current?.focus({ preventScroll: true });
  }

  function toggleClues() {
    if (isTyping) setShowCluesWhileTyping((value) => !value);
    else setSheetExpanded((value) => !value);
  }

  return (
    <VStack
      gap={0}
      ref={frameRef}
      height={mobileMap ? height : undefined}
      className={
        compactViewport
          ? "fixed inset-x-0 top-0 z-20 min-h-0 overflow-hidden bg-surface"
          : isCountryRound
            ? "min-h-0 -mx-3 -mt-4 -mb-4 overflow-hidden sm:-mx-4 sm:-mt-5 sm:-mb-5 lg:mx-0 lg:mt-0 lg:mb-0 lg:overflow-visible"
            : "min-w-0"
      }
      data-game-play=""
      data-mobile-map={mobileMap || undefined}
    >
      <HStack
        gap={2}
        justify="between"
        align="center"
        paddingInline={4}
        paddingBlock={1}
        className={compactViewport ? "hidden" : "shrink-0 lg:px-0"}
      >
        <VStack gap={0} className="min-w-0">
          <Text color="secondary" type="supporting" className="hidden lg:block">
            {flowLabel}
          </Text>
          <Text weight="medium" maxLines={1}>
            {currentCategoryLabel} · {getModeMeta(currentMode).label}
          </Text>
        </VStack>
        <HStack gap={2} align="center" className="shrink-0">
          <Text
            color="accent"
            weight="semibold"
            textWrap="nowrap"
            hasTabularNumbers
          >
            {potentialScore} pts
          </Text>
          <IconButton
            label="Game options"
            tooltip="Game options"
            icon={<MoreHorizontal />}
            variant="ghost"
            size="lg"
            onClick={() => setActionsOpen(true)}
          />
        </HStack>
      </HStack>
      {header ? (
        <VStack
          className={compactViewport ? "hidden" : "shrink-0"}
          paddingInline={4}
        >
          {header}
        </VStack>
      ) : null}
      {result ? (
        <VStack
          className="shrink-0 lg:px-0"
          paddingInline={4}
          paddingBlockStart={2}
          paddingBlockEnd={3}
        >
          <Banner
            description={
              result.status === "win"
                ? `You solved it: ${result.canonicalAnswer}. This round is complete.`
                : `The answer was ${result.canonicalAnswer}. This round is complete.`
            }
            status={result.status === "win" ? "success" : "error"}
            title={result.status === "win" ? "Game won" : "Game lost"}
          />
        </VStack>
      ) : null}
      <VStack
        gap={0}
        className={
          isCountryRound
            ? "min-h-0 flex-1 lg:relative lg:block lg:h-[80dvh] lg:flex-none"
            : "min-h-0 flex-1"
        }
      >
        {isCountryRound ? (
          <VStack
            className="min-h-0 flex-1 lg:absolute lg:inset-0 lg:h-full"
            data-game-map=""
          >
            <WorldMapDialog
              countryOptions={availableCountryOptions}
              guessedCountries={guessedCountries}
              embedded
              isExpanded={isMapExpanded}
              onExpandedChange={setIsMapExpanded}
              onCountryGuess={
                round?.canGuess && !isBusy
                  ? (country) => {
                      inputRef.current?.blur();
                      handleMapGuess(country);
                    }
                  : undefined
              }
              solutionCountry={
                solutionCountry ?? result?.solutionCountry ?? null
              }
            />
          </VStack>
        ) : null}
        <VStack
          gap={0}
          as="section"
          aria-label="Clues and guess"
          height={sheetHeight}
          className={`relative min-h-0 shrink-0 bg-surface ${isCountryRound ? "rounded-t-3xl border-t border-border lg:absolute lg:bottom-4 lg:right-4 lg:z-10 lg:max-h-[90%] lg:w-96 lg:rounded-xl lg:border lg:shadow-lg" : "w-full rounded-xl border border-border"}`}
          data-clue-sheet=""
          data-compact={compactSheet || undefined}
        >
          {mobileMap ? (
            <Button
              label="Resize clue sheet"
              variant="ghost"
              icon={<GripHorizontal className="text-secondary" />}
              className="h-6 shrink-0 touch-none rounded-none"
              width="100%"
              aria-expanded={sheetExpanded}
              aria-controls={cluesId}
              onPointerDown={(event) => {
                dragStart.current = event.clientY;
                didDrag.current = false;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerUp={(event) => {
                if (dragStart.current !== null) {
                  const distance = event.clientY - dragStart.current;
                  didDrag.current = Math.abs(distance) > 16;
                  if (didDrag.current) setSheetExpanded(distance < 0);
                }
                dragStart.current = null;
              }}
              onPointerCancel={() => {
                dragStart.current = null;
                didDrag.current = true;
              }}
              onClick={() => {
                if (!didDrag.current) toggleClues();
              }}
            >
              <Text className="sr-only">Resize clue sheet</Text>
            </Button>
          ) : null}
          <HStack
            justify="between"
            align="center"
            gap={2}
            paddingInline={4}
            className="min-h-8 shrink-0 lg:py-2"
          >
            <Text weight="semibold" id={`${cluesId}-heading`} textWrap="nowrap">
              Clues {revealedCount}/{currentClues.length}
            </Text>
            {compactSheet && latestClue ? (
              <Text className="min-w-0 truncate" color="secondary">
                {renderClueValue(latestClue)}
              </Text>
            ) : null}
            {mobileMap ? (
              <Button
                label={
                  compactSheet
                    ? "Expand clues"
                    : sheetExpanded || showCluesWhileTyping
                      ? "Collapse clues"
                      : "Expand clues"
                }
                variant="ghost"
                size="sm"
                className="shrink-0"
                icon={
                  sheetExpanded || showCluesWhileTyping ? (
                    <ChevronDown />
                  ) : (
                    <ChevronUp />
                  )
                }
                aria-expanded={
                  !compactSheet && (sheetExpanded || showCluesWhileTyping)
                }
                aria-controls={cluesId}
                onMouseDown={(event) => event.preventDefault()}
                onClick={toggleClues}
              >
                {compactSheet
                  ? "Expand"
                  : sheetExpanded || showCluesWhileTyping
                    ? "Collapse"
                    : "Expand"}
              </Button>
            ) : null}
          </HStack>
          <VStack
            id={cluesId}
            ref={clueScrollRef}
            isScrollable={!compactSheet}
            paddingInline={4}
            className={
              compactSheet
                ? "hidden"
                : "min-h-0 flex-1 overscroll-contain touch-pan-y"
            }
          >
            <List
              density="balanced"
              hasDividers
              aria-labelledby={`${cluesId}-heading`}
            >
              {shownClues.map((clue) => {
                const remaining = round
                  ? getClueUnlockRoundsRemaining(currentClues, clue)
                  : 0;
                return (
                  <ListItem
                    key={clue.key}
                    label={clue.label}
                    endContent={
                      clue.isRevealed || !round ? (
                        <Text
                          className="max-w-48 break-words text-right"
                          weight="medium"
                        >
                          {renderClueValue(clue)}
                        </Text>
                      ) : remaining > 0 ? (
                        <Text type="supporting" className="max-w-32 text-right">
                          Unlocks after {remaining} more{" "}
                          {remaining === 1 ? "clue" : "clues"}
                        </Text>
                      ) : (
                        <Button
                          label={`Reveal ${clue.label}`}
                          size="lg"
                          variant="secondary"
                          icon={<Eye />}
                          isDisabled={isBusy || !isRevealStep}
                          onClick={() => revealClue(clue.key)}
                        >
                          {isRevealStep ? "Reveal" : "Guess first"}
                        </Button>
                      )
                    }
                  />
                );
              })}
            </List>
            {shownClues.length === 0 ? (
              <Text color="secondary">First clue coming up</Text>
            ) : null}
            {boardAction}
            {sideFooter ? <VStack paddingBlock={3}>{sideFooter}</VStack> : null}
          </VStack>
          {round ? (
            <VStack
              paddingInline={3}
              paddingBlock={2}
              gap={2}
              className="shrink-0 border-t border-border"
            >
              {isRevealStep ? (
                <Text color="secondary">
                  Choose an unlocked clue, then make a guess.
                </Text>
              ) : (
                <form
                  onSubmit={(event) => {
                    if (canSubmitGuess) inputRef.current?.blur();
                    setIsCountryListOpen(false);
                    handleGuessSubmit(event);
                  }}
                >
                  <VStack gap={compactSheet ? 1 : 2} className="relative">
                    <FieldLabel
                      inputID={inputId}
                      label="Your guess"
                      isLabelHidden={compactSheet}
                    />
                    <HStack gap={2} align="center">
                      <HStack
                        align="center"
                        className="relative min-w-0 flex-1"
                      >
                        <Search
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3 size-4 text-secondary"
                        />
                        <input
                          id={inputId}
                          ref={inputRef}
                          type="text"
                          role={isCountryRound ? "combobox" : undefined}
                          aria-autocomplete={
                            isCountryRound ? "list" : undefined
                          }
                          aria-controls={isCountryRound ? optionsId : undefined}
                          aria-expanded={
                            isCountryRound ? suggestionsOpen : undefined
                          }
                          aria-activedescendant={
                            suggestionsOpen && activeOption >= 0
                              ? `${optionsId}-${activeOption}`
                              : undefined
                          }
                          aria-invalid={validationMessage ? true : undefined}
                          aria-describedby={
                            validationMessage ? validationId : undefined
                          }
                          aria-label={
                            isCountryRound ? "Search country" : "Type answer"
                          }
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          enterKeyHint="go"
                          className="min-h-8 w-full min-w-0 rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-base text-primary outline-none focus:border-accent-bg focus:ring-2 focus:ring-accent-muted"
                          disabled={isBusy}
                          value={guess}
                          placeholder={
                            isCountryRound ? "Search country" : "Type answer"
                          }
                          onFocus={() => {
                            setIsTyping(true);
                            setShowCluesWhileTyping(false);
                            setIsCountryListOpen(hasCountrySearch);
                          }}
                          onBlur={() => {
                            setIsTyping(false);
                            setIsCountryListOpen(false);
                            setActiveOption(-1);
                          }}
                          onChange={(event) => {
                            setGuess(event.target.value);
                            setActiveOption(-1);
                            setIsCountryListOpen(
                              normalizeGuess(event.target.value).length > 0,
                            );
                          }}
                          onKeyDown={(event) => {
                            if (
                              !isCountryRound ||
                              event.nativeEvent.isComposing
                            )
                              return;
                            if (
                              event.key === "ArrowDown" ||
                              event.key === "ArrowUp"
                            ) {
                              event.preventDefault();
                              if (!hasCountrySearch) return;
                              setIsCountryListOpen(true);
                              const count = matchingCountries.length;
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
                                  .getElementById(`${optionsId}-${next}`)
                                  ?.scrollIntoView({ block: "nearest" }),
                              );
                            } else if (event.key === "Escape") {
                              setIsCountryListOpen(false);
                              setActiveOption(-1);
                            } else if (
                              event.key === "Enter" &&
                              suggestionsOpen &&
                              activeOption >= 0 &&
                              matchingCountries[activeOption]
                            ) {
                              event.preventDefault();
                              selectCountry(matchingCountries[activeOption]);
                            }
                          }}
                        />
                      </HStack>
                      <Button
                        label="Guess"
                        size="lg"
                        type="submit"
                        variant="primary"
                        className="shrink-0"
                        isDisabled={!canSubmitGuess}
                        isLoading={isBusy}
                        onMouseDown={(event) => event.preventDefault()}
                      />
                    </HStack>
                    {isCountryRound && suggestionsOpen ? (
                      matchingCountries.length ? (
                        <HStack
                          id={optionsId}
                          role="listbox"
                          aria-label="Country suggestions"
                          gap={1}
                          className={
                            compactSheet
                              ? "max-h-24 overflow-y-auto overscroll-contain rounded-lg bg-surface p-1"
                              : "absolute inset-x-0 bottom-full z-30 max-h-32 overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface p-2 shadow-lg"
                          }
                          wrap="wrap"
                        >
                          {matchingCountries.map((country, index) => (
                            <button
                              key={country}
                              id={`${optionsId}-${index}`}
                              role="option"
                              aria-selected={activeOption === index}
                              tabIndex={-1}
                              type="button"
                              className="min-h-8 rounded-lg bg-muted px-2 py-1 text-left text-sm text-primary hover:bg-accent-muted aria-selected:bg-accent-muted"
                              onPointerDown={(event) => event.preventDefault()}
                              onClick={() => selectCountry(country)}
                            >
                              {country}
                            </button>
                          ))}
                        </HStack>
                      ) : (
                        <Text
                          type="supporting"
                          role="status"
                          className={
                            compactSheet
                              ? "p-1"
                              : "absolute inset-x-0 bottom-full z-30 rounded-lg border border-border bg-surface p-2 shadow-lg"
                          }
                        >
                          No matching countries. Try another name.
                        </Text>
                      )
                    ) : null}
                    {validationMessage && !suggestionsOpen ? (
                      <Text
                        id={validationId}
                        role="status"
                        className="text-warning"
                      >
                        {validationMessage}
                      </Text>
                    ) : null}
                  </VStack>
                </form>
              )}
            </VStack>
          ) : null}
          {mobileMap ? (
            <VStack
              aria-hidden="true"
              height="env(safe-area-inset-bottom)"
              className="shrink-0"
            />
          ) : null}
          {view === "result" ? (
            <HStack padding={3} gap={2} wrap="wrap">
              {showRestartButton ? (
                <Button
                  label={restartButtonLabel}
                  onClick={startRound}
                  isDisabled={isBusy}
                  variant="primary"
                />
              ) : null}
              {showHomeButton ? (
                <Button
                  label={homeButtonLabel}
                  onClick={clearForCategoryChoice}
                  variant="secondary"
                />
              ) : null}
            </HStack>
          ) : null}
        </VStack>
      </VStack>
      {actionsOpen ? (
        <Dialog isOpen onOpenChange={setActionsOpen} padding={5}>
          <DialogHeader title="Game options" onOpenChange={setActionsOpen} />
          <VStack gap={3}>
            <Text color="secondary">
              {flowLabel} · {getModeMeta(currentMode).label}
            </Text>
            {round ? (
              <Button
                label="Give up"
                icon={<Ban />}
                onClick={() => requestExit("give-up")}
              />
            ) : null}
            {showRestartButton ? (
              <Button
                label={restartButtonLabel}
                icon={<RotateCcw />}
                isDisabled={isBusy}
                onClick={() => requestExit("restart")}
              />
            ) : null}
            {showHomeButton ? (
              <Button
                label={homeButtonLabel}
                icon={<House />}
                onClick={() => requestExit("home")}
              />
            ) : null}
          </VStack>
        </Dialog>
      ) : null}
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
    </VStack>
  );
}
