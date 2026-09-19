"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { List, ListItem } from "@astryxdesign/core/List";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Gauge, Trophy } from "lucide-react";

import { GAME_MODE_OPTIONS } from "@/src/components/game-shell/config";
import { getModeMeta } from "@/src/components/game-shell/utils";
import { getDailyComboKey } from "@/src/lib/game/daily";
import type { DailyLeaderboardPageData, GameMode } from "@/src/lib/types";

type LeaderboardPeriod = "today" | "total";

const PODIUM_RANKS = [
  { medal: "🥇" },
  { medal: "🥈" },
  { medal: "🥉" },
] as const;

interface DailyLeaderboardShellProps {
  data: DailyLeaderboardPageData;
  initialMode: GameMode;
  initialPeriod: LeaderboardPeriod;
}

function LocalCompletionTime({ completedAt }: { completedAt: string }) {
  const [formattedTime, setFormattedTime] = useState<string | null>(null);

  useEffect(() => {
    setFormattedTime(
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(completedAt)),
    );
  }, [completedAt]);

  return <time dateTime={completedAt}>{formattedTime ?? "—"}</time>;
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
      <Card className="p-4 sm:p-6" elevation="low" padding={0}>
        <div className="flex items-center justify-between gap-3">
          <time
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary"
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
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-secondary transition hover:bg-card hover:text-primary dark:hover:bg-surface/8 dark:hover:text-on-accent"
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

        <h1 className="m-0 mt-3 max-w-3xl font-heading text-3xl sm:text-4xl font-semibold leading-tight tracking-tight text-primary">
          {period === "today" ? "Today's leaderboard" : "All-time leaderboard"}
        </h1>
        <p className="m-0 mt-3 hidden max-w-2xl text-base leading-7 text-secondary sm:block">
          {period === "today"
            ? "See the top scores from today's challenge."
            : "See the top players across every completed challenge."}
        </p>
      </Card>

      <Card className="grid gap-4 p-4 sm:p-6" elevation="low" padding={0}>
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            <Trophy aria-hidden="true" className="size-4" strokeWidth={2.2} />
            Rankings
          </div>
          <SegmentedControl
            label="Leaderboard period"
            onChange={(value) => setPeriod(value as LeaderboardPeriod)}
            value={period}
          >
            {(["today", "total"] as const).map((entryPeriod) => (
              <SegmentedControlItem
                key={entryPeriod}
                label={entryPeriod === "today" ? "Today" : "All time"}
                value={entryPeriod}
              />
            ))}
          </SegmentedControl>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
            <Gauge aria-hidden="true" className="size-4" strokeWidth={2.2} />
            Mode
          </div>
          <SegmentedControl
            label="Game mode"
            onChange={(value) => setSelectedMode(value as GameMode)}
            value={selectedMode}
          >
            {GAME_MODE_OPTIONS.map((mode) => (
              <SegmentedControlItem
                key={mode.id}
                label={mode.label}
                value={mode.id}
              />
            ))}
          </SegmentedControl>
        </div>

        <VStack gap={3} paddingBlock={2}>
          <Text color="secondary" type="supporting" weight="semibold">
            {selectedModeMeta.label}
          </Text>
          {period === "total" ? (
            <Text color="secondary">
              A win is a round where the player gets any points by guessing the
              correct answer.
            </Text>
          ) : null}
          {period === "total" ? (
            <Text color="secondary" type="supporting" weight="semibold">
              Games · Score
            </Text>
          ) : null}
          <List density="balanced" hasDividers>
            {entries.length === 0 ? (
              <ListItem label="No scores yet." />
            ) : (
              entries.map((entry, index) => (
                <ListItem
                  description={
                    entry.completedAt ? (
                      <LocalCompletionTime completedAt={entry.completedAt} />
                    ) : period === "today" ? (
                      "Today"
                    ) : (
                      `${entry.roundsWon ?? 0} ${(entry.roundsWon ?? 0) === 1 ? "win" : "wins"}`
                    )
                  }
                  endContent={
                    <HStack gap={2}>
                      {period === "total" ? (
                        <Text
                          aria-label={`${entry.roundsPlayed ?? 0} ${(entry.roundsPlayed ?? 0) === 1 ? "game" : "games"} played`}
                          color="secondary"
                          type="supporting"
                        >
                          {entry.roundsPlayed ?? 0} games
                        </Text>
                      ) : null}
                      <Text color="accent" weight="semibold">
                        {entry.score}
                      </Text>
                    </HStack>
                  }
                  key={`${entry.playerKey}-${index}`}
                  label={`${PODIUM_RANKS[index]?.medal ?? `${index + 1}.`} ${entry.displayName}`}
                />
              ))
            )}
          </List>
        </VStack>

        <Button
          href="/"
          icon={<ArrowLeft aria-hidden="true" />}
          label="Play a round"
          variant="primary"
          width="100%"
        />
      </Card>
    </section>
  );
}
