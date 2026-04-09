import { primaryButtonClass, secondaryButtonClass } from "@/src/components/game-shell/config";
import { getCategoryMeta } from "@/src/components/game-shell/utils";
import type { RoundOutcome } from "@/src/components/game-shell/types";
import { Ban, House, PartyPopper, RotateCcw, Trophy } from "lucide-react";

interface GameResultDialogProps {
  clearForCategoryChoice: () => void;
  currentCategory: string | null;
  currentCategoryLabel: string;
  isBusy: boolean;
  result: RoundOutcome;
  startRound: () => void;
}

export function GameResultDialog({
  clearForCategoryChoice,
  currentCategory,
  currentCategoryLabel,
  isBusy,
  result,
  startRound,
}: GameResultDialogProps) {
  const CurrentCategoryIcon = getCategoryMeta(currentCategory).icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(25,20,14,0.46)] p-4 backdrop-blur-sm dark:bg-[rgba(3,7,14,0.62)]">
      <div
        aria-labelledby="round-result-title"
        aria-modal="true"
        className="w-full max-w-md rounded-4xl border border-[rgba(17,94,89,0.14)] bg-[linear-gradient(180deg,rgba(255,251,245,0.98),rgba(255,247,238,0.95))] p-6 shadow-[0_30px_80px_rgba(29,22,14,0.26)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,22,34,0.98),rgba(19,29,43,0.95))] dark:shadow-[0_30px_80px_rgba(0,0,0,0.46)] sm:p-7"
        role="dialog"
      >
        <div className="flex items-start gap-4">
          <span
            className={`inline-flex size-14 shrink-0 items-center justify-center rounded-[22px] ${
              result.status === "win"
                ? "bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.18))] dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.14))]"
                : "bg-[linear-gradient(135deg,rgba(220,38,38,0.14),rgba(251,191,36,0.12))] dark:bg-[linear-gradient(135deg,rgba(248,113,113,0.18),rgba(251,191,36,0.1))]"
            }`}
          >
            {result.status === "win" ? (
              <PartyPopper aria-hidden="true" className="size-6 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
            ) : (
              <Ban aria-hidden="true" className="size-6 text-[#1f1b17] dark:text-[#f5f7fb]" strokeWidth={2.1} />
            )}
          </span>

          <div className="min-w-0">
            <p className="m-0 text-[0.74rem] font-semibold uppercase tracking-[0.2em] text-[#115e59] dark:text-[#75e6d7]">
              {result.status === "win" ? "Solved" : "Missed"}
            </p>
            <h2
              className="m-0 mt-2 font-serif-display text-[clamp(2rem,8vw,3.1rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-[#1f1b17] dark:text-[#f5f7fb]"
              id="round-result-title"
            >
              {result.canonicalAnswer}
            </h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-[22px] border border-black/8 bg-white/78 p-4 dark:border-white/10 dark:bg-white/6">
            <Trophy aria-hidden="true" className="size-5 text-[#115e59] dark:text-[#8ff4e7]" strokeWidth={2.1} />
            <div>
              <span className="block text-[0.72rem] uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]">Score</span>
              <strong className="text-[#1f1b17] dark:text-[#f5f7fb]">{result.score} pts</strong>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-[22px] border border-black/8 bg-white/78 p-4 dark:border-white/10 dark:bg-white/6">
            <CurrentCategoryIcon aria-hidden="true" className="size-5 text-[#115e59] dark:text-[#8ff4e7]" strokeWidth={2.1} />
            <div>
              <span className="block text-[0.72rem] uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]">Deck</span>
              <strong className="text-[#1f1b17] dark:text-[#f5f7fb]">{currentCategoryLabel}</strong>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button className={`${primaryButtonClass} flex-1`} disabled={isBusy} onClick={startRound} type="button">
            <RotateCcw aria-hidden="true" className="size-4" strokeWidth={2.2} />
            Play again
          </button>
          <button className={`${secondaryButtonClass} flex-1`} disabled={isBusy} onClick={clearForCategoryChoice} type="button">
            <House aria-hidden="true" className="size-4" strokeWidth={2.2} />
            Decks
          </button>
        </div>
      </div>
    </div>
  );
}
