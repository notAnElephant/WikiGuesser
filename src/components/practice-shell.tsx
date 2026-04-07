"use client";

import { normalizeGuess } from "@/src/lib/game/answer-matching";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import type { CategorySummary, EntityCategory, GuessRoundResult, PlayableClue, StartRoundResult } from "@/src/lib/types";

interface PracticeShellProps {
  categories: CategorySummary[];
  countryOptions: string[];
}

interface ActiveRound extends StartRoundResult {
  revealedClues: PlayableClue[];
}

interface RoundOutcome {
  status: "win" | "loss";
  canonicalAnswer: string;
  score: number;
  category: EntityCategory;
  revealedClues: PlayableClue[];
}

const pillButtonBase =
  "inline-flex flex-none items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0";
const primaryButtonClass = `${pillButtonBase} bg-[#0f766e] text-white`;
const secondaryButtonClass = `${pillButtonBase} bg-[rgba(15,118,110,0.14)] text-[#115e59]`;
const launchButtonClass = `${pillButtonBase} border border-[rgba(17,94,89,0.16)] bg-[linear-gradient(135deg,#fffaf2_0%,#f8ecce_46%,#f2d680_100%)] px-5 text-[#1f1b17] shadow-[0_14px_36px_rgba(83,58,20,0.16)] hover:shadow-[0_18px_42px_rgba(83,58,20,0.22)]`;

function categoryChipClass(isActive: boolean): string {
  return `${pillButtonBase} ${isActive ? "bg-[#0f766e] text-white" : "bg-white/75 text-[#1f1b17]"}`;
}

export function PracticeShell({ categories, countryOptions }: PracticeShellProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("random");
  const [round, setRound] = useState<ActiveRound | null>(null);
  const [result, setResult] = useState<RoundOutcome | null>(null);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("Pick a category from the menu, then launch a round.");
  const [score, setScore] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const isCountryRound = round?.category === "countries";
  const validCountryLookup = new Map(countryOptions.map((option) => [normalizeGuess(option), option]));
  const hasGuess = guess.trim().length > 0;
  const isCountryGuessValid = !isCountryRound || validCountryLookup.has(normalizeGuess(guess));
  const view = round ? "round" : result ? "result" : "menu";

  function startRound() {
    setGuess("");
    setScore(null);
    setResult(null);

    startTransition(async () => {
      const response = await fetch("/api/rounds/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: selectedCategory,
        }),
      });

      if (!response.ok) {
        setMessage("Round start failed. Check the snapshot or API logs.");
        return;
      }

      const data = (await response.json()) as StartRoundResult;
      setRound(data);
      setMessage("Round live. Lock a guess when you want the next reveal to depend on your call.");
    });
  }

  function submitGuess() {
    if (!round || !guess.trim()) {
      return;
    }

    if (isCountryRound && !isCountryGuessValid) {
      setMessage("Choose a country from the list before locking your guess.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/rounds/${round.roundId}/guess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: round.token,
          guess,
        }),
      });

      if (!response.ok) {
        setMessage("Guess submission failed. Try starting a new round.");
        return;
      }

      const data = (await response.json()) as GuessRoundResult;
      setScore(data.score || null);
      setGuess("");

      if (data.isCorrect) {
        setRound(null);
        setResult({
          status: "win",
          canonicalAnswer: data.canonicalAnswer ?? "Unknown",
          score: data.score,
          category: data.category,
          revealedClues: data.revealedClues,
        });
        setMessage(`Correct. ${data.canonicalAnswer} for ${data.score} points.`);
        return;
      }

      if (data.isComplete) {
        setRound(null);
        setResult({
          status: "loss",
          canonicalAnswer: data.canonicalAnswer ?? "Unknown",
          score: 0,
          category: data.category,
          revealedClues: data.revealedClues,
        });
        setMessage(`Out of clues. The answer was ${data.canonicalAnswer}.`);
        return;
      }

      setRound({
        roundId: data.roundId,
        token: data.token!,
        category: data.category,
        revealedClues: data.revealedClues,
        remainingClues: data.remainingClues,
      });
      setMessage("Not yet. One more clue unlocked.");
    });
  }

  function handleGuessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitGuess();
  }

  function clearForCategoryChoice() {
    setRound(null);
    setResult(null);
    setGuess("");
    setScore(null);
    setMessage("Pick a category and start a fresh round.");
  }

  const displayedClues = round?.revealedClues ?? result?.revealedClues ?? [];
  const selectedCategoryMeta = categories.find((category) => category.id === selectedCategory);
  const selectedCategoryLabel = selectedCategory === "random" ? "Random mix" : selectedCategoryMeta?.label ?? selectedCategory;
  const currentCategory = round?.category ?? result?.category ?? selectedCategory;
  const currentCategoryMeta = categories.find((category) => category.id === currentCategory);

  if (view === "menu") {
    return (
      <div className="flex min-h-[calc(100dvh-1rem)] flex-col gap-4 sm:min-h-[calc(100dvh-1.5rem)] sm:gap-5">
        <header className="grid gap-4 rounded-[30px] border border-black/10 bg-[radial-gradient(circle_at_top_left,rgba(249,214,129,0.35),transparent_28%),linear-gradient(180deg,rgba(255,251,245,0.97),rgba(255,247,238,0.9))] p-5 shadow-[0_24px_60px_rgba(53,36,22,0.12)] backdrop-blur-xl sm:p-7">
          <div className="grid gap-3 sm:grid-cols-[1.3fr_0.7fr] sm:items-end">
            <div>
              <p className="m-0 mb-3 text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#115e59]">Main menu</p>
              <h1 className="m-0 max-w-[10ch] font-serif-display text-[clamp(2.3rem,8vw,4.3rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-[#1f1b17]">
                WikiGuesser
              </h1>
              <p className="m-0 mt-4 max-w-2xl leading-7 text-[#6b6259]">
                Choose a lane, then drop into a focused round screen with clues, guessing, and result handling kept separate from the menu.
              </p>
            </div>
            <div className="grid gap-3 rounded-[26px] border border-[rgba(17,94,89,0.08)] bg-white/80 p-4">
              <span className="text-sm uppercase tracking-[0.18em] text-[#115e59]">Current setup</span>
              <strong className="font-serif-display text-[clamp(1.2rem,3vw,1.7rem)] leading-[1.05] text-[#1f1b17]">
                {selectedCategoryLabel}
              </strong>
              <span className="text-sm leading-6 text-[#6b6259]">
                {selectedCategory === "random"
                  ? "Pull from any available category in the loaded snapshot."
                  : selectedCategoryMeta?.description ?? "Use the selected category for the next round."}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-4 rounded-[30px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,251,245,0.96),rgba(255,247,238,0.86))] p-5 shadow-[0_24px_60px_rgba(53,36,22,0.12)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="m-0 mb-2 text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#115e59]">Choose a category</p>
              <h2 className="m-0 font-serif-display text-[clamp(1.75rem,5vw,2.8rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[#1f1b17]">
                Launch from the menu.
              </h2>
            </div>
            <button className={launchButtonClass} disabled={isPending} onClick={startRound} type="button">
              Start round
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button
              className={`grid gap-3 rounded-[26px] border p-4 text-left transition ${
                selectedCategory === "random"
                  ? "border-[#0f766e] bg-[linear-gradient(160deg,rgba(15,118,110,0.14),rgba(255,255,255,0.92))] shadow-[0_18px_44px_rgba(15,118,110,0.12)]"
                  : "border-black/10 bg-white/85 hover:-translate-y-0.5"
              }`}
              onClick={() => setSelectedCategory("random")}
              type="button"
            >
              <span className="text-[0.74rem] font-bold uppercase tracking-[0.18em] text-[#115e59]">Random</span>
              <strong className="font-serif-display text-2xl tracking-[-0.04em] text-[#1f1b17]">Mixed deck</strong>
              <span className="leading-6 text-[#6b6259]">Pull from all loaded categories and let the round pick the target.</span>
            </button>
            {categories.map((category) => (
              <button
                className={`grid gap-3 rounded-[26px] border p-4 text-left transition ${
                  selectedCategory === category.id
                    ? "border-[#0f766e] bg-[linear-gradient(160deg,rgba(15,118,110,0.14),rgba(255,255,255,0.92))] shadow-[0_18px_44px_rgba(15,118,110,0.12)]"
                    : "border-black/10 bg-white/85 hover:-translate-y-0.5"
                }`}
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                type="button"
              >
                <span className="text-[0.74rem] font-bold uppercase tracking-[0.18em] text-[#115e59]">{category.entityCount} loaded</span>
                <strong className="font-serif-display text-2xl tracking-[-0.04em] text-[#1f1b17]">{category.label}</strong>
                <span className="leading-6 text-[#6b6259]">{category.description}</span>
              </button>
            ))}
          </div>

          <p className="m-0 text-sm leading-6 text-[#6b6259]">{message}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-1rem)] flex-col gap-2 sm:min-h-[calc(100dvh-1.5rem)] sm:gap-3">
      <header className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 mb-3 text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#115e59]">
            {view === "round" ? "Round screen" : "Round result"}
          </p>
          <h1 className="m-0 max-w-[10ch] font-serif-display text-[clamp(2.1rem,7vw,3.7rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-[#1f1b17] sm:max-w-none">
            {view === "round" ? "Stay inside the round." : "Round closed."}
          </h1>
        </div>
        <div className="scrollbar-hidden flex gap-3 overflow-x-auto">
          <span className="whitespace-nowrap rounded-full bg-white/75 px-4 py-2 text-sm text-[#115e59]">
            {currentCategoryMeta?.label ?? selectedCategoryLabel}
          </span>
          <span className="whitespace-nowrap rounded-full bg-white/75 px-4 py-2 text-sm text-[#115e59]">{score ?? 0} pts</span>
        </div>
      </header>

      <section className="relative grid flex-1 gap-4 rounded-3xl border border-black/10 bg-[linear-gradient(180deg,rgba(255,251,245,0.96),rgba(255,247,238,0.86))] p-4 shadow-[0_24px_60px_rgba(53,36,22,0.12)] backdrop-blur-xl sm:rounded-[30px] sm:p-[1.15rem]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="m-0 mb-3 text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#115e59]">
              {round ? "Live clues" : "Resolved answer"}
            </p>
            <h2 className="m-0 max-w-[12ch] font-serif-display text-[clamp(1.75rem,5vw,2.8rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[#1f1b17]">
              {round
                ? "Guess before the next clue drops."
                : "Review the answer, then choose your next move."}
            </h2>
          </div>
          {round ? (
            <button className={launchButtonClass} disabled={isPending} onClick={startRound} type="button">
              Restart round
            </button>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button className={primaryButtonClass} disabled={isPending} onClick={startRound} type="button">
                Play again
              </button>
              <button className={secondaryButtonClass} disabled={isPending} onClick={clearForCategoryChoice} type="button">
                Back to menu
              </button>
            </div>
          )}
        </div>

        <p className="m-0 leading-7 text-[#6b6259]">{message}</p>

        <ol className="grid gap-3 p-0 m-0 list-none">
          {displayedClues.map((clue, index) => (
            <li
              className="grid gap-1 rounded-3xl border border-[rgba(17,94,89,0.08)] bg-white/85 p-4"
              key={clue.key}
            >
              <small className="text-sm text-[#6b6259]">Clue {index + 1}</small>
              <span className="text-[#6b6259]">{clue.label}</span>
              <strong className="text-[clamp(1.2rem,4vw,1.7rem)] leading-[1.05] text-[#1f1b17]">{clue.value}</strong>
            </li>
          ))}
          {displayedClues.length === 0 && (
            <li className="grid min-h-45 content-center gap-1 rounded-3xl border border-[rgba(17,94,89,0.08)] bg-white/85 p-4">
              <small className="text-sm text-[#6b6259]">Round idle</small>
              <strong className="text-[clamp(1.2rem,4vw,1.7rem)] leading-[1.05] text-[#1f1b17]">Pick a category and start.</strong>
              <span className="text-[#6b6259]">The interface stays lean once the round begins.</span>
            </li>
          )}
        </ol>

        {round ? (
          <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={handleGuessSubmit}>
            <label className="grid flex-1 gap-2">
              <span className="text-sm text-[#6b6259]">Guess</span>
              <input
                aria-label="Submit your entity guess"
                className="w-full rounded-[18px] border border-black/10 bg-white/85 px-4 py-4 text-[#1f1b17] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[rgba(15,118,110,0.22)]"
                list={isCountryRound ? "country-guess-options" : undefined}
                disabled={!round || isPending}
                onChange={(event) => setGuess(event.target.value)}
                placeholder={isCountryRound ? "Search countries" : "Type your answer"}
                type="text"
                value={guess}
              />
              {isCountryRound ? (
                <span className="text-sm text-[#6b6259]">
                  Search the country list and choose one of the valid loaded countries.
                </span>
              ) : null}
              {isCountryRound && hasGuess && !isCountryGuessValid ? (
                <span className="text-sm text-[#b45309]">Select one of the listed countries to submit this guess.</span>
              ) : null}
            </label>
            <button
              className={`${primaryButtonClass} sm:min-w-36`}
              disabled={!round || isPending || !hasGuess || !isCountryGuessValid}
              type="submit"
            >
              Lock guess
            </button>
          </form>
        ) : null}
        {isCountryRound ? (
          <datalist id="country-guess-options">
            {countryOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        ) : null}

        <div className="flex flex-col gap-3 text-sm text-[#115e59] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <span>Remaining clues: {round?.remainingClues ?? 0}</span>
            <span>{selectedCategoryMeta?.entityCount ?? categories.length} entities loaded</span>
          </div>
          <button className={secondaryButtonClass} disabled={isPending} onClick={clearForCategoryChoice} type="button">
            Back to menu
          </button>
        </div>
      </section>
    </div>
  );
}
