"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import type { CategorySummary, GuessRoundResult, PlayableClue, StartRoundResult } from "@/src/lib/types";

interface PracticeShellProps {
  categories: CategorySummary[];
}

interface ActiveRound extends StartRoundResult {
  revealedClues: PlayableClue[];
}

interface RoundOutcome {
  status: "win" | "loss";
  canonicalAnswer: string;
  score: number;
  category: string;
  revealedClues: PlayableClue[];
}

const pillButtonBase =
  "inline-flex flex-none items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0";
const primaryButtonClass = `${pillButtonBase} bg-[#0f766e] text-white`;
const secondaryButtonClass = `${pillButtonBase} bg-[rgba(15,118,110,0.14)] text-[#115e59]`;

function categoryChipClass(isActive: boolean): string {
  return `${pillButtonBase} ${isActive ? "bg-[#0f766e] text-white" : "bg-white/75 text-[#1f1b17]"}`;
}

export function PracticeShell({ categories }: PracticeShellProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("random");
  const [round, setRound] = useState<ActiveRound | null>(null);
  const [result, setResult] = useState<RoundOutcome | null>(null);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("Tap start and stay with the clues. The screen stays focused on the round.");
  const [score, setScore] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

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
      setMessage("Round live. Guess whenever you think you have it.");
    });
  }

  function submitGuess() {
    if (!round || !guess.trim()) {
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

  return (
    <div className="flex min-h-[calc(100dvh-1rem)] flex-col gap-2 sm:min-h-[calc(100dvh-1.5rem)] sm:gap-3">
      <header className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 mb-3 text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#115e59]">Practice mode</p>
          <h1 className="m-0 max-w-[8ch] font-serif-display text-[clamp(2.2rem,8vw,4rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-[#1f1b17] sm:max-w-none">
            WikiGuesser
          </h1>
        </div>
        <div className="scrollbar-hidden flex gap-3 overflow-x-auto">
          <span className="whitespace-nowrap rounded-full bg-white/75 px-4 py-2 text-sm text-[#115e59]">{selectedCategoryLabel}</span>
          <span className="whitespace-nowrap rounded-full bg-white/75 px-4 py-2 text-sm text-[#115e59]">{score ?? 0} pts</span>
        </div>
      </header>

      <div className="scrollbar-hidden flex gap-3 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Choose a category">
        <button className={categoryChipClass(selectedCategory === "random")} onClick={() => setSelectedCategory("random")} type="button">
          Random
        </button>
        {categories.map((category) => (
          <button
            className={categoryChipClass(selectedCategory === category.id)}
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            type="button"
          >
            {category.label}
          </button>
        ))}
      </div>

      <section className="relative grid flex-1 gap-4 rounded-3xl border border-black/10 bg-[linear-gradient(180deg,rgba(255,251,245,0.96),rgba(255,247,238,0.86))] p-4 shadow-[0_24px_60px_rgba(53,36,22,0.12)] backdrop-blur-xl sm:rounded-[30px] sm:p-[1.15rem]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="m-0 mb-3 text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#115e59]">
              {round ? "Round live" : result ? "Round complete" : "Ready"}
            </p>
            <h2 className="m-0 max-w-[12ch] font-serif-display text-[clamp(1.75rem,5vw,2.8rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[#1f1b17]">
              {round
                ? "Guess before the next clue drops."
                : result
                  ? "Round resolved."
                  : "A single screen, tuned for quick rounds."}
            </h2>
          </div>
          <button disabled={isPending} onClick={startRound} type="button">
            {round ? "Restart" : result ? "Replay" : "Start"}
          </button>
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

        <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={handleGuessSubmit}>
          <label className="grid flex-1 gap-2">
            <span className="text-sm text-[#6b6259]">Guess</span>
            <input
              aria-label="Submit your entity guess"
              className="w-full rounded-[18px] border border-black/10 bg-white/85 px-4 py-4 text-[#1f1b17] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[rgba(15,118,110,0.22)]"
              disabled={!round || isPending}
              onChange={(event) => setGuess(event.target.value)}
              placeholder={round ? "Type your answer" : "Start a round to unlock guessing"}
              type="text"
              value={guess}
            />
          </label>
          <button className={`${primaryButtonClass} sm:min-w-36`} disabled={!round || isPending || !guess.trim()} type="submit">
            Lock guess
          </button>
        </form>

        <div className="flex flex-col gap-3 text-sm text-[#115e59] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <span>Remaining clues: {round?.remainingClues ?? 0}</span>
            <span>{selectedCategoryMeta?.entityCount ?? categories.length} entities loaded</span>
          </div>
          <button className={secondaryButtonClass} disabled={isPending} onClick={clearForCategoryChoice} type="button">
            Choose category
          </button>
        </div>
      </section>

      {result && (
        <div className="fixed inset-0 grid place-items-end bg-[rgba(18,16,12,0.48)] p-4 backdrop-blur-md sm:place-items-center">
          <section
            className={`w-full max-w-130 rounded-[28px] p-6 shadow-[0_34px_90px_rgba(17,16,12,0.24)] ${
              result.status === "win"
                ? "bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.28),transparent_35%),linear-gradient(160deg,#fef7dc_0%,#fffaf0_100%)]"
                : "bg-[radial-gradient(circle_at_top_left,rgba(190,24,93,0.18),transparent_32%),linear-gradient(160deg,#fff0ec_0%,#fff9f7_100%)]"
            }`}
            role="dialog"
            aria-labelledby="result-title"
            aria-modal="true"
          >
            <p className="m-0 mb-3 text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#115e59]">
              {result.status === "win" ? "You nailed it" : "Round over"}
            </p>
            <h2 id="result-title" className="m-0 font-serif-display text-4xl font-semibold tracking-[-0.05em] text-[#1f1b17]">
              {result.status === "win" ? "Sharp solve." : "That one got away."}
            </h2>
            <p className="mb-2 mt-2 font-serif-display text-[clamp(1.2rem,4vw,1.7rem)] leading-[1.05] text-[#1f1b17]">
              {result.canonicalAnswer}
            </p>
            <div className="flex flex-col gap-2 text-sm text-[#115e59] sm:flex-row sm:justify-between">
              <span>{result.status === "win" ? `${result.score} points` : "0 points"}</span>
              <span>{categories.find((category) => category.id === result.category)?.label ?? "Round"}</span>
            </div>
            <p className="mb-5 mt-4 leading-7 text-[#6b6259]">
              {result.status === "win"
                ? "Keep the momentum and run another round from the same lane or switch categories."
                : "Reset fast, change the category, or queue the next round immediately."}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button className={`${primaryButtonClass} w-full sm:w-auto`} disabled={isPending} onClick={startRound} type="button">
                Play again
              </button>
              <button className={`${secondaryButtonClass} w-full sm:w-auto`} disabled={isPending} onClick={clearForCategoryChoice} type="button">
                Another category
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
