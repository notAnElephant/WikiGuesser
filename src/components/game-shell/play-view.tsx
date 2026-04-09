import {
  primaryButtonClass,
  secondaryButtonClass,
  surfaceClass,
} from "@/src/components/game-shell/config";
import {
  getCategoryMeta,
  getClueIcon,
  getModeMeta,
  isClueLocked,
  renderClueValue,
  renderHiddenCluePlaceholder,
} from "@/src/components/game-shell/utils";
import type {
  MessageAppearance,
  RoundOutcome,
} from "@/src/components/game-shell/types";
import type { ActiveRound } from "@/src/components/game-shell/types";
import type { GameMode, RoundClue } from "@/src/lib/types";
import {
  ArrowRight,
  CircleAlert,
  Eye,
  House,
  LoaderCircle,
  Lock,
  PartyPopper,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import type { FormEvent } from "react";

interface GamePlayViewProps {
  availableCountryOptions: string[];
  canSubmitGuess: boolean;
  clearForCategoryChoice: () => void;
  currentCategory: string | null;
  currentCategoryLabel: string;
  currentClues: RoundClue[];
  currentMode: GameMode | null;
  displayScore: number;
  guess: string;
  guessedEntities: string[];
  guessButtonLabel: string;
  handleGuessSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isBusy: boolean;
  isCountryRound: boolean;
  message: string;
  result: RoundOutcome | null;
  revealClue: (clueKey: string) => void;
  revealedCount: number;
  round: ActiveRound | null;
  setGuess: (value: string) => void;
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
  guess,
  guessedEntities,
  guessButtonLabel,
  handleGuessSubmit,
  isBusy,
  isCountryRound,
  message,
  result,
  revealClue,
  revealedCount,
  round,
  setGuess,
  startRound,
  statusAppearance,
  validationMessage,
  view,
  visibleClassicClues,
}: GamePlayViewProps) {
  const currentModeMeta = getModeMeta(currentMode);
  const CurrentCategoryIcon = getCategoryMeta(currentCategory).icon;
  const CurrentModeIcon = currentModeMeta.icon;
  const StatusIcon = statusAppearance.icon;

  return (
    <div className="grid min-h-[calc(100dvh-1rem)] gap-4 sm:min-h-[calc(100dvh-1.5rem)] sm:gap-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0f766e]/12 bg-[#0f766e]/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:border-[#24d4c2]/14 dark:bg-[#24d4c2]/8 dark:text-[#8ff4e7]">
            {result?.status === "win" ? (
              <PartyPopper
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={2.2}
              />
            ) : (
              <Play aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
            )}
            {view === "round"
              ? "Round live"
              : result?.status === "win"
                ? "Solved"
                : "Answer shown"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/78 px-3 py-1.5 text-sm font-medium text-[#115e59] dark:bg-white/6 dark:text-[#8ff4e7]">
            <CurrentCategoryIcon
              aria-hidden="true"
              className="size-4"
              strokeWidth={2.2}
            />
            {currentCategoryLabel}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/78 px-3 py-1.5 text-sm font-medium text-[#115e59] dark:bg-white/6 dark:text-[#8ff4e7]">
            <CurrentModeIcon
              aria-hidden="true"
              className="size-4"
              strokeWidth={2.2}
            />
            {currentModeMeta.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:w-auto">
          <div className="rounded-[20px] border border-black/8 bg-white/78 px-3 py-2 dark:border-white/10 dark:bg-white/6">
            <span className="block text-[0.7rem] uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]">
              Score
            </span>
            <strong className="text-[1.2rem] text-[#1f1b17] dark:text-[#f5f7fb]">
              {displayScore}
            </strong>
          </div>
          <div className="rounded-[20px] border border-black/8 bg-white/78 px-3 py-2 dark:border-white/10 dark:bg-white/6">
            <span className="block text-[0.7rem] uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]">
              Left
            </span>
            <strong className="text-[1.2rem] text-[#1f1b17] dark:text-[#f5f7fb]">
              {round?.remainingClues ?? 0}
            </strong>
          </div>
          <div className="rounded-[20px] border border-black/8 bg-white/78 px-3 py-2 dark:border-white/10 dark:bg-white/6">
            <span className="block text-[0.7rem] uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]">
              Tried
            </span>
            <strong className="text-[1.2rem] text-[#1f1b17] dark:text-[#f5f7fb]">
              {guessedEntities.length}
            </strong>
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_340px]">
        <section
          className={`${surfaceClass} grid content-start gap-4 p-4 sm:p-5`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="m-0 font-serif-display text-[clamp(1.95rem,6vw,3.2rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-[#1f1b17] dark:text-[#f5f7fb]">
                {currentMode === "blurred-lines"
                  ? "Open the dossier"
                  : "Read the trail"}
              </h1>
              <p className="m-0 mt-2 text-sm text-[#6b6259] dark:text-[#9aa9bb]">
                {currentMode === "blurred-lines"
                  ? "Reveal only what you need."
                  : "Each miss burns another clue."}
              </p>
            </div>

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
          </div>

          <div className="grid gap-2 rounded-3xl border border-black/8 bg-white/72 p-4 dark:border-white/10 dark:bg-white/5">
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
                            <div className="flex w-full items-start justify-between gap-3">
                              <span className="min-w-0 text-[1.02rem] leading-7 text-[#202122] dark:text-[#edf3fa]">
                                {renderClueValue(clue)}
                              </span>
                              <span
                                aria-hidden="true"
                                className="pointer-events-none inline-flex select-none items-center gap-1 rounded-full px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] opacity-0"
                              >
                                <Eye
                                  aria-hidden="true"
                                  className="size-3"
                                  strokeWidth={2.2}
                                />
                                Reveal
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
                    className={`rounded-[28px] border p-4 ${
                      index === visibleClassicClues.length - 1 && round
                        ? "border-[#0f766e]/16 bg-[linear-gradient(160deg,rgba(15,118,110,0.12),rgba(255,255,255,0.92))] dark:border-[#24d4c2]/18 dark:bg-[linear-gradient(160deg,rgba(36,212,194,0.12),rgba(17,24,39,0.92))]"
                        : "border-black/8 bg-white/84 dark:border-white/10 dark:bg-[rgba(255,255,255,0.05)]"
                    }`}
                    key={clue.key}
                  >
                    <div className="flex items-start gap-4">
                      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.12))] text-[#1f1b17] dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))] dark:text-[#f5f7fb]">
                        <ClueIcon
                          aria-hidden="true"
                          className="size-5"
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
                    aria-label="Submit your entity guess"
                    className="w-full rounded-[20px] border border-black/10 bg-white/86 px-12 py-4 text-[#1f1b17] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[rgba(15,118,110,0.22)] dark:border-white/10 dark:bg-[rgba(255,255,255,0.06)] dark:text-[#f5f7fb] dark:focus:border-[#24d4c2] dark:focus:ring-[rgba(36,212,194,0.22)]"
                    list={isCountryRound ? "country-guess-options" : undefined}
                    disabled={isBusy}
                    onChange={(event) => setGuess(event.target.value)}
                    placeholder={
                      isCountryRound ? "Search country" : "Type answer"
                    }
                    type="text"
                    value={guess}
                  />
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
              </form>

              {guessedEntities.length > 0 ? (
                <div className="grid gap-2">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
                    Tried
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {guessedEntities.map((entity) => (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(220,38,38,0.14)] bg-[rgba(254,242,242,0.95)] px-3 py-1 text-xs font-medium text-[#991b1b] dark:border-[rgba(248,113,113,0.2)] dark:bg-[rgba(127,29,29,0.18)] dark:text-[#fca5a5]"
                        key={entity}
                      >
                        <X
                          aria-hidden="true"
                          className="size-3.5 shrink-0 text-[#dc2626] dark:text-[#f87171]"
                          strokeWidth={2.25}
                        />
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
              New round
            </button>
            <button
              className={`${secondaryButtonClass} w-full`}
              disabled={isBusy}
              onClick={clearForCategoryChoice}
              type="button"
            >
              <House aria-hidden="true" className="size-4" strokeWidth={2.2} />
              Categories
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
