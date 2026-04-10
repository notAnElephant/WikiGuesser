"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CalendarDays, Crown, Sparkles, Trophy } from "lucide-react";

import {
  GAME_MODE_OPTIONS,
  primaryButtonClass,
  secondaryButtonClass,
  surfaceClass,
} from "@/src/components/game-shell/config";
import { getCategoryMeta, getModeMeta, selectionCardClass } from "@/src/components/game-shell/utils";
import { getDailyComboKey } from "@/src/lib/game/daily";
import type {
  CategorySummary,
  DailyLeaderboardPageData,
  EntityCategory,
  GameMode,
} from "@/src/lib/types";

type LeaderboardPeriod = "today" | "total";

interface DailyLeaderboardShellProps {
  categories: CategorySummary[];
  data: DailyLeaderboardPageData;
  initialCategory: EntityCategory;
  initialMode: GameMode;
  initialPeriod: LeaderboardPeriod;
}

export function DailyLeaderboardShell({
  categories,
  data,
  initialCategory,
  initialMode,
  initialPeriod,
}: DailyLeaderboardShellProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<EntityCategory>(initialCategory);
  const [selectedMode, setSelectedMode] = useState<GameMode>(initialMode);
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);
  const comboKey = getDailyComboKey(selectedCategory, selectedMode);
  const leaderboard =
    data.leaderboardByCombo[comboKey] ??
    data.leaderboardByCombo[
      getDailyComboKey(data.defaultCategory, data.defaultMode)
    ]!;
  const entries = period === "today" ? leaderboard.today : leaderboard.total;
  const selectedCategoryMeta = getCategoryMeta(selectedCategory);
  const selectedModeMeta = getModeMeta(selectedMode);
  const SelectedCategoryIcon = selectedCategoryMeta.icon;
  const SelectedModeIcon = selectedModeMeta.icon;

  return (
    <section className="grid gap-4">
      <header className={`${surfaceClass} overflow-hidden p-5 sm:p-6`}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-end">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0f766e]/12 bg-[#0f766e]/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:border-[#24d4c2]/14 dark:bg-[#24d4c2]/8 dark:text-[#8ff4e7]">
                <Crown aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
                Daily leaderboard
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/76 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:border-white/10 dark:bg-white/6 dark:text-[#9aa9bb]">
                <CalendarDays
                  aria-hidden="true"
                  className="size-3.5"
                  strokeWidth={2.2}
                />
                {data.dayKey}
              </span>
            </div>

            <div>
              <h1 className="m-0 font-serif-display text-[clamp(2.3rem,8vw,4rem)] font-semibold leading-[0.92] tracking-[-0.065em] text-[#1f1b17] dark:text-[#f5f7fb]">
                See how today stacks up
              </h1>
              <p className="m-0 mt-3 max-w-2xl text-[1rem] leading-7 text-[#6b6259] dark:text-[#9aa9bb]">
                Filter by category and mode, then switch between today's board
                and the long-run total standings.
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-[28px] border border-black/8 bg-white/78 p-4 dark:border-white/10 dark:bg-white/6">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.12))] p-2.5 dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))]">
                <SelectedCategoryIcon
                  aria-hidden="true"
                  className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]"
                  strokeWidth={2.1}
                />
              </span>
              <span className="inline-flex rounded-2xl bg-white/76 p-2.5 dark:bg-white/8">
                <SelectedModeIcon
                  aria-hidden="true"
                  className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]"
                  strokeWidth={2.1}
                />
              </span>
              <div>
                <p className="m-0 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
                  Selection
                </p>
                <strong className="mt-1 block font-serif-display text-[1.4rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                  {categories.find((entry) => entry.id === selectedCategory)?.label} ·{" "}
                  {selectedModeMeta.label}
                </strong>
              </div>
            </div>

            <Link className={secondaryButtonClass} href="/">
              <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2.2} />
              Back home
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
        <section className={`${surfaceClass} grid gap-5 p-5 sm:p-6`}>
          <div className="grid gap-3">
            <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
              <Sparkles
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.2}
              />
              Category
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((category) => {
                const categoryMeta = getCategoryMeta(category.id);
                const CategoryIcon = categoryMeta.icon;

                return (
                  <button
                    className={selectionCardClass(selectedCategory === category.id)}
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`inline-flex rounded-2xl bg-linear-to-br p-2.5 ${categoryMeta.accent}`}
                      >
                        <CategoryIcon
                          aria-hidden="true"
                          className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]"
                          strokeWidth={2.1}
                        />
                      </span>
                    </div>
                    <strong className="font-serif-display text-[1.55rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                      {category.label}
                    </strong>
                    <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">
                      {categoryMeta.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
              <Sparkles
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.2}
              />
              Mode
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {GAME_MODE_OPTIONS.map((mode) => {
                const ModeIcon = mode.icon;

                return (
                  <button
                    className={selectionCardClass(selectedMode === mode.id)}
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex rounded-2xl bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.12))] p-2.5 dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.18),rgba(56,189,248,0.12))]">
                        <ModeIcon
                          aria-hidden="true"
                          className="size-5 text-[#1f1b17] dark:text-[#f5f7fb]"
                          strokeWidth={2.1}
                        />
                      </span>
                      <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-semibold text-[#6b6259] dark:bg-white/8 dark:text-[#9aa9bb]">
                        {mode.summary}
                      </span>
                    </div>
                    <strong className="font-serif-display text-[1.55rem] tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]">
                      {mode.label}
                    </strong>
                    <span className="text-sm text-[#6b6259] dark:text-[#9aa9bb]">
                      {mode.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className={`${surfaceClass} grid gap-4 p-5 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#115e59] dark:text-[#75e6d7]">
              <Trophy aria-hidden="true" className="size-4" strokeWidth={2.2} />
              Standings
            </div>
            <div className="inline-flex rounded-full border border-black/8 bg-white/76 p-1 dark:border-white/10 dark:bg-white/6">
              {(["today", "total"] as const).map((entryPeriod) => (
                <button
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    period === entryPeriod
                      ? "bg-[#0f766e] text-white dark:bg-[#24d4c2] dark:text-[#082825]"
                      : "text-[#6b6259] dark:text-[#9aa9bb]"
                  }`}
                  key={entryPeriod}
                  onClick={() => setPeriod(entryPeriod)}
                  type="button"
                >
                  {entryPeriod === "today" ? "Today" : "Total"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-black/8 bg-white/76 p-4 dark:border-white/10 dark:bg-white/6">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6b6259] dark:text-[#9aa9bb]">
              {categories.find((entry) => entry.id === selectedCategory)?.label} ·{" "}
              {selectedModeMeta.label}
            </div>
            <div className="mt-3 grid gap-2">
              {entries.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-black/10 px-4 py-6 text-center text-sm text-[#6b6259] dark:border-white/10 dark:text-[#9aa9bb]">
                  No scores yet.
                </div>
              ) : (
                entries.map((entry, index) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-[22px] border border-black/8 bg-white/84 px-4 py-3 dark:border-white/10 dark:bg-[rgba(255,255,255,0.05)]"
                    key={`${entry.playerKey}-${index}`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1f1b17] dark:text-[#f5f7fb]">
                        {index + 1}. {entry.displayName}
                      </div>
                      <div className="text-xs text-[#6b6259] dark:text-[#9aa9bb]">
                        {period === "today"
                          ? entry.completedAt
                            ? new Date(entry.completedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Today"
                          : `${entry.roundsWon ?? 0} wins`}
                      </div>
                    </div>
                    <strong className="text-[#115e59] dark:text-[#8ff4e7]">
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
        </aside>
      </div>
    </section>
  );
}
