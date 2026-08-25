"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CalendarDays, Gauge, Trophy } from "lucide-react";

import {
  GAME_MODE_OPTIONS,
  primaryButtonClass,
  surfaceClass,
} from "@/src/components/game-shell/config";
import { getModeMeta } from "@/src/components/game-shell/utils";
import { getDailyComboKey } from "@/src/lib/game/daily";
import type { DailyLeaderboardPageData, GameMode } from "@/src/lib/types";

type LeaderboardPeriod = "today" | "total";

interface DailyLeaderboardShellProps {
  data: DailyLeaderboardPageData;
  initialMode: GameMode;
  initialPeriod: LeaderboardPeriod;
}

const segmentedControlClass =
  "inline-flex rounded-full border border-black/8 bg-white/76 p-1 dark:border-white/10 dark:bg-white/6";

function segmentedButtonClass(isActive: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-medium transition ${
    isActive
      ? "bg-[#0f766e] text-white dark:bg-[#24d4c2] dark:text-[#082825]"
      : "text-[#6b6259] hover:text-[#1f1b17] dark:text-[#9aa9bb] dark:hover:text-white"
  }`;
}

export function DailyLeaderboardShell({
  data,
  initialMode,
  initialPeriod,
}: DailyLeaderboardShellProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode>(initialMode);
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);
  const comboKey = getDailyComboKey(data.defaultCategory, selectedMode);
  const leaderboard =
    data.leaderboardByCombo[comboKey] ??
    data.leaderboardByCombo[
      getDailyComboKey(data.defaultCategory, data.defaultMode)
    ]!;
  const entries = period === "today" ? leaderboard.today : leaderboard.total;
  const selectedModeMeta = getModeMeta(selectedMode);

  return (
    <section className="grid gap-3 sm:gap-4">
      <header className={`${surfaceClass} p-4 sm:p-6`}>
        <div className="flex items-center justify-between gap-3">
          <time
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b6259] dark:text-[#9aa9bb]"
            dateTime={data.dayKey}
          >
            <CalendarDays
              aria-hidden="true"
              className="size-3.5"
              strokeWidth={2.2}
            />
            {data.dayKey}
          </time>
          <Link
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[#6b6259] transition hover:bg-white/70 hover:text-[#1f1b17] dark:text-[#c7d3e2] dark:hover:bg-white/8 dark:hover:text-white"
            href="/"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-4"
              strokeWidth={2.2}
            />
            Back home
          </Link>
        </div>

        <h1 className="m-0 mt-3 max-w-3xl font-serif-display text-[clamp(2.15rem,9vw,3.6rem)] font-semibold leading-[0.94] tracking-[-0.06em] text-[#1f1b17] dark:text-[#f5f7fb]">
          {period === "today" ? "Today's leaderboard" : "All-time leaderboard"}
        </h1>
        <p className="m-0 mt-3 hidden max-w-2xl text-[0.98rem] leading-7 text-[#6b6259] dark:text-[#9aa9bb] sm:block">
          {period === "today"
            ? "See the top scores from today's challenge."
            : "See the top players across every completed challenge."}
        </p>
      </header>

      <section className={`${surfaceClass} grid gap-4 p-4 sm:p-6`}>
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
            <Trophy aria-hidden="true" className="size-4" strokeWidth={2.2} />
            Rankings
          </div>
          <div className={segmentedControlClass}>
            {(["today", "total"] as const).map((entryPeriod) => (
              <button
                aria-pressed={period === entryPeriod}
                className={segmentedButtonClass(period === entryPeriod)}
                key={entryPeriod}
                onClick={() => setPeriod(entryPeriod)}
                type="button"
              >
                {entryPeriod === "today" ? "Today" : "All time"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-black/8 pt-3 dark:border-white/10">
          <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
            <Gauge aria-hidden="true" className="size-4" strokeWidth={2.2} />
            Mode
          </div>
          <div className={segmentedControlClass}>
            {GAME_MODE_OPTIONS.map((mode) => (
              <button
                aria-pressed={selectedMode === mode.id}
                className={segmentedButtonClass(selectedMode === mode.id)}
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                type="button"
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-black/8 bg-white/76 p-3 dark:border-white/10 dark:bg-white/6 sm:p-4">
          <div className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
            {selectedModeMeta.label}
          </div>
          {period === "total" ? (
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_4rem_4rem] gap-2 px-4 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#6b6259] dark:text-[#9aa9bb] sm:grid-cols-[minmax(0,1fr)_5rem_5rem]">
              <span>Player</span>
              <span className="text-center">Games</span>
              <span className="text-right">Score</span>
            </div>
          ) : null}
          <div className="grid gap-2">
            {entries.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-black/10 px-4 py-6 text-center text-sm text-[#6b6259] dark:border-white/10 dark:text-[#9aa9bb]">
                No scores yet.
              </div>
            ) : (
              entries.map((entry, index) => (
                <div
                  className={`items-center gap-2 rounded-[20px] border border-black/8 bg-white/84 px-4 py-3 dark:border-white/10 dark:bg-[rgba(255,255,255,0.05)] ${
                    period === "total"
                      ? "grid grid-cols-[minmax(0,1fr)_4rem_4rem] sm:grid-cols-[minmax(0,1fr)_5rem_5rem]"
                      : "flex justify-between"
                  }`}
                  key={`${entry.playerKey}-${index}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[#1f1b17] dark:text-[#f5f7fb]">
                      {index + 1}. {entry.displayName}
                    </div>
                    <div className="text-xs text-[#6b6259] dark:text-[#9aa9bb]">
                      {entry.completedAt
                        ? new Date(entry.completedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : period === "today"
                          ? "Today"
                          : `${entry.roundsWon ?? 0} ${(entry.roundsWon ?? 0) === 1 ? "win" : "wins"}`}
                    </div>
                  </div>
                  {period === "total" ? (
                    <span
                      aria-label={`${entry.roundsPlayed ?? 0} ${(entry.roundsPlayed ?? 0) === 1 ? "game" : "games"} played`}
                      className="text-center text-sm font-semibold tabular-nums text-[#6b6259] dark:text-[#c7d3e2]"
                    >
                      {entry.roundsPlayed ?? 0}
                    </span>
                  ) : null}
                  <strong className="text-right tabular-nums text-[#115e59] dark:text-[#8ff4e7]">
                    {entry.score}
                  </strong>
                </div>
              ))
            )}
          </div>
        </div>

        <Link className={primaryButtonClass} href="/">
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2.2} />
          Play a round
        </Link>
      </section>
    </section>
  );
}
