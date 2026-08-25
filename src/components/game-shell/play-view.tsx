"use client";

import {
  primaryButtonClass,
  secondaryButtonClass,
  surfaceClass,
} from "@/src/components/game-shell/config";
import type {
  ActiveRound,
  GuessAttempt,
  MessageAppearance,
  RoundOutcome,
} from "@/src/components/game-shell/types";
import {
  getCategoryMeta,
  getClueIcon,
  getFlagImageUrl,
  getModeMeta,
  isClueLocked,
  renderClueValue,
  renderHiddenCluePlaceholder,
} from "@/src/components/game-shell/utils";
import { normalizeGuess } from "@/src/lib/game/answer-matching";
import type { GameMode, GuessDirection, RoundClue } from "@/src/lib/types";
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
import { type FormEvent, useDeferredValue, useEffect, useState } from "react";
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
}: GamePlayViewProps) {
  const flagImageUrl = getFlagImageUrl(currentClues);

  if (flagImageUrl) {
    preload(flagImageUrl, { as: "image" });
  }

  const currentModeMeta = getModeMeta(currentMode);
  const CurrentCategoryIcon = getCategoryMeta(currentCategory).icon;
  const CurrentModeIcon = currentModeMeta.icon;
  const [isCountryListOpen, setIsCountryListOpen] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const deferredGuess = useDeferredValue(guess);
  const normalizedSearch = normalizeGuess(deferredGuess);
  const matchingCountryOptions = isCountryRound
    ? availableCountryOptions
        .filter((option) => normalizeGuess(option).includes(normalizedSearch))
        .slice(0, 8)
    : [];
  const guessedCountries = guessedEntities.flatMap((attempt) =>
    attempt.mapData ? [attempt.mapData] : [],
  );

  useEffect(() => {
    if (
      message === "Round live." ||
      message === "Daily live." ||
      message === "Tap a row."
    ) {
      return;
    }

    toast[statusAppearance.tone](message, { id: "game-status" });
  }, [message, messageRevision, statusAppearance.tone]);

  return (
    <div className="grid min-h-[calc(100dvh-1rem)] gap-3 sm:min-h-[calc(100dvh-1.5rem)] sm:gap-5">
      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(400px,0.75fr)]">
        <section
          className={`${surfaceClass} grid content-start gap-2.5 p-3 sm:gap-4 sm:p-5`}
        >
          <div className="min-w-0">
            <h1 className="m-0 font-serif-display text-[1.9rem] font-semibold leading-[0.94] tracking-tighter text-[#1f1b17] dark:text-[#f5f7fb] sm:text-[clamp(2rem,4vw,2.6rem)]">
              {currentMode === "blurred-lines"
                ? "Choose your clues"
                : "Follow the clues"}
            </h1>
            {currentMode === "blurred-lines" ? (
              <p className="m-0 mt-1 text-xs leading-4 text-[#6b6259] dark:text-[#9aa9bb] sm:mt-2 sm:text-sm">
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
                    ? "bg-[#0f766e] dark:bg-[#24d4c2]"
                    : clue.spoilerLevel === "late"
                      ? "bg-[#d6d3d1] dark:bg-white/16"
                      : "bg-[#d9d1c3] dark:bg-white/12"
                }`}
                key={clue.key}
              />
            ))}
          </div>

          {currentMode === "blurred-lines" ? (
            <div className="overflow-hidden rounded-[28px] border border-[#a2a9b1] bg-[#f8f9fa] shadow-[0_18px_38px_rgba(60,64,67,0.08)] dark:border-white/10 dark:bg-[#111a27] dark:shadow-[0_18px_38px_rgba(0,0,0,0.34)]">
              <table className="w-full border-collapse text-left text-sm text-[#202122] dark:text-[#edf3fa]">
                <thead>
                  <tr className="bg-white text-xs uppercase tracking-[0.16em] text-[#54595d] dark:bg-[#101926] dark:text-[#99a9bc]">
                    <th className="w-[38%] border-b border-r border-[#c8ccd1] px-4 py-3 font-semibold dark:border-white/10">
                      Field
                    </th>
                    <th className="border-b border-[#c8ccd1] px-4 py-3 font-semibold dark:border-white/10">
                      Reveal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentClues.map((clue, index) => {
                    const isLocked =
                      Boolean(round) && isClueLocked(currentClues, clue);
                    const ClueIcon = getClueIcon(clue.key);

                    return (
                      <tr
                        className={`${index % 2 === 0 ? "bg-white dark:bg-[#121c2a]" : "bg-[#f8f9fa] dark:bg-[#162231]"} ${isLocked ? "opacity-60" : ""}`}
                        key={clue.key}
                      >
                        <th className="border-r border-t border-[#c8ccd1] px-4 py-3 align-top font-semibold text-[#202122] dark:border-white/10 dark:text-[#edf3fa]">
                          <span className="inline-flex items-center gap-2">
                            <ClueIcon
                              aria-hidden="true"
                              className="size-4"
                              strokeWidth={2.1}
                            />
                            <span>{clue.label}</span>
                          </span>
                        </th>
                        <td className="border-t border-[#c8ccd1] px-4 py-3 align-top dark:border-white/10">
                          {clue.isRevealed ? (
                            <div className="w-full">
                              <span className="block min-w-0 text-[1.02rem] leading-7 text-[#202122] dark:text-[#edf3fa]">
                                {renderClueValue(clue)}
                              </span>
                            </div>
                          ) : round ? (
                            isLocked ? (
                              <div className="flex w-full items-start justify-between gap-3">
                                <span className="min-w-0">
                                  {renderHiddenCluePlaceholder(clue, true)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(248,250,252,0.88)] px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#54595d] dark:bg-[rgba(15,23,36,0.88)] dark:text-[#99a9bc]">
                                  <Lock
                                    aria-hidden="true"
                                    className="size-3"
                                    strokeWidth={2.2}
                                  />
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
                            <span className="text-[1.02rem] leading-7 text-[#202122] dark:text-[#edf3fa]">
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
                    className={`rounded-[22px] border p-3 sm:rounded-[28px] sm:p-4 ${
                      index === visibleClassicClues.length - 1 && round
                        ? "border-[#0f766e]/16 bg-[linear-gradient(160deg,rgba(15,118,110,0.12),rgba(255,255,255,0.92))] dark:border-[#24d4c2]/18 dark:bg-[linear-gradient(160deg,rgba(36,212,194,0.12),rgba(17,24,39,0.92))]"
                        : "border-black/8 bg-white/84 dark:border-white/10 dark:bg-[rgba(255,255,255,0.05)]"
                    }`}
                    key={clue.key}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.12))] text-[#1f1b17] dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))] dark:text-[#f5f7fb] sm:size-11 sm:rounded-2xl">
                        <ClueIcon
                          aria-hidden="true"
                          className="size-4 sm:size-5"
                          strokeWidth={2.1}
                        />
                      </span>
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
                          <span className="inline-flex size-5 items-center justify-center rounded-full bg-black/5 text-[0.65rem] dark:bg-white/8">
                            {index + 1}
                          </span>
                          {clue.label}
                        </div>
                        <strong className="mt-1.5 block text-[1.18rem] leading-[1.08] text-[#1f1b17] dark:text-[#f5f7fb] sm:mt-2 sm:text-[clamp(1.28rem,4vw,1.82rem)]">
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
                      <Sparkles
                        aria-hidden="true"
                        className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]"
                        strokeWidth={2.1}
                      />
                    </span>
                    <strong className="font-serif-display text-[1.5rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                      First clue coming up
                    </strong>
                  </div>
                </li>
              ) : null}
            </ol>
          )}
        </section>

        <aside className="grid content-start gap-4">
          {view === "round" ? (
            <WorldMapDialog
              guessedCountries={guessedCountries}
              isExpanded={isMapExpanded}
              onExpandedChange={setIsMapExpanded}
            />
          ) : null}

          {round ? (
            <div className={`${surfaceClass} grid gap-4 p-4`}>
              <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
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
                    className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#6b6259] dark:text-[#9aa9bb]"
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
                    className="w-full rounded-[20px] border border-black/10 bg-white/86 px-12 py-4 text-[#1f1b17] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[rgba(15,118,110,0.22)] dark:border-white/10 dark:bg-[rgba(255,255,255,0.06)] dark:text-[#f5f7fb] dark:focus:border-[#24d4c2] dark:focus:ring-[rgba(36,212,194,0.22)]"
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
                      className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 max-h-64 overflow-y-auto rounded-[20px] border border-black/10 bg-white p-1.5 shadow-[0_18px_45px_rgba(31,27,23,0.2)] dark:border-white/12 dark:bg-[#172231]"
                      id="country-guess-options"
                      role="listbox"
                    >
                      {matchingCountryOptions.map((option) => (
                        <button
                          className="block w-full rounded-2xl px-3 py-3 text-left text-sm font-medium text-[#1f1b17] hover:bg-[#0f766e]/8 focus:bg-[#0f766e]/8 focus:outline-none dark:text-[#f5f7fb] dark:hover:bg-white/8 dark:focus:bg-white/8"
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
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/18 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700 dark:border-amber-300/16 dark:bg-amber-300/10 dark:text-amber-200">
                    <CircleAlert
                      aria-hidden="true"
                      className="size-4 shrink-0"
                      strokeWidth={2.2}
                    />
                    {validationMessage}
                  </div>
                ) : !round.canGuess ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/76 px-3 py-2 text-sm font-medium text-[#6b6259] dark:border-white/10 dark:bg-white/6 dark:text-[#9aa9bb]">
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

                <button
                  className={`${primaryButtonClass} w-full`}
                  disabled={!canSubmitGuess}
                  type="submit"
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
                      strokeWidth={2.3}
                    />
                  )}
                  {guessButtonLabel}
                </button>
                <button
                  className={`${secondaryButtonClass} w-full`}
                  disabled={isBusy}
                  onClick={giveUpRound}
                  type="button"
                >
                  <Ban
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={2.2}
                  />
                  Give up
                </button>
              </form>

              {guessedEntities.length > 0 ? (
                <div className="grid gap-2">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
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
                          className="flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(220,38,38,0.14)] bg-[rgba(254,242,242,0.95)] px-3 py-2.5 text-sm font-medium text-[#991b1b] dark:border-[rgba(248,113,113,0.2)] dark:bg-[rgba(127,29,29,0.18)] dark:text-[#fca5a5]"
                          key={attempt.name}
                        >
                          <span>{attempt.name}</span>
                          {DirectionIcon && directionMeta ? (
                            <span
                              aria-label={`The goal country is ${directionMeta.label} of ${attempt.name}`}
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-[#b91c1c] shadow-sm dark:bg-white/10 dark:text-[#fca5a5]"
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
            </div>
          ) : null}

          <div className={`${surfaceClass} grid gap-3 p-4`}>
            {showRestartButton ? (
              <button
                className={`${secondaryButtonClass} w-full`}
                disabled={isBusy}
                onClick={startRound}
                type="button"
              >
                <RotateCcw
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2.2}
                />
                {restartButtonLabel}
              </button>
            ) : null}
            <button
              className={`${secondaryButtonClass} w-full`}
              disabled={isBusy}
              onClick={clearForCategoryChoice}
              type="button"
            >
              <House aria-hidden="true" className="size-4" strokeWidth={2.2} />
              {homeButtonLabel}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
