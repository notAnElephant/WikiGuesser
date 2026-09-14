import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { VStack } from "@astryxdesign/core/VStack";
import { ArrowLeft, Gamepad2, Trophy } from "lucide-react";
import Link from "next/link";

import { GAME_MODE_OPTIONS } from "@/src/components/game-shell/config";
import type { PlayerStatsPageData } from "@/src/lib/repository/game-stats-repository";
import type { GameMode } from "@/src/lib/types";

interface PlayerStatsShellProps {
  data: PlayerStatsPageData;
}

function percentage(wins: number, played: number) {
  return played === 0 ? 0 : Math.round((wins / played) * 100);
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card padding={4}>
      <p className="m-0 text-xs font-semibold uppercase tracking-wider text-secondary">
        {label}
      </p>
      <strong className="mt-1 block text-2xl tabular-nums text-primary">
        {value}
      </strong>
    </Card>
  );
}

function ModeStats({
  data,
  mode,
  title,
}: {
  data: PlayerStatsPageData;
  mode: GameMode;
  title: "Free play" | "Daily";
}) {
  const freePlayStats = data.freePlay.find(
    (entry) => entry.category === "countries" && entry.mode === mode,
  );
  const dailyStats = data.daily.find(
    (entry) => entry.category === "countries" && entry.mode === mode,
  );
  const stats = title === "Free play" ? freePlayStats : dailyStats;
  const roundsPlayed = stats?.roundsPlayed ?? 0;
  const roundsWon = stats?.roundsWon ?? 0;
  const totalScore = stats?.totalScore ?? 0;
  const bestScore = stats?.bestScore ?? 0;
  const modeLabel = GAME_MODE_OPTIONS.find(
    (option) => option.id === mode,
  )?.label;

  return (
    <Card className="grid gap-4" elevation="low" padding={5}>
      <section aria-label={`${title} ${modeLabel} statistics`}>
        <p className="m-0 text-xs font-semibold uppercase tracking-wider text-accent">
          {title}
        </p>
        <h2 className="m-0 mt-1 font-heading text-xl font-semibold text-primary">
          {modeLabel}
        </h2>
      </section>
      <Grid columns={{ minWidth: 120, max: 3 }} gap={3}>
        <StatCard label="Score" value={totalScore} />
        <StatCard label="Best round" value={bestScore} />
        <StatCard
          label="Win rate"
          value={`${percentage(roundsWon, roundsPlayed)}%`}
        />
      </Grid>
      <p className="m-0 text-sm text-secondary">
        {roundsWon}/{roundsPlayed} {roundsPlayed === 1 ? "round" : "rounds"} won
        {title === "Free play"
          ? ` · ${freePlayStats?.currentStreak ?? 0} current streak · ${freePlayStats?.bestStreak ?? 0} best streak`
          : null}
      </p>
    </Card>
  );
}

export function PlayerStatsShell({ data }: PlayerStatsShellProps) {
  return (
    <VStack gap={4}>
      <Card elevation="low" padding={6}>
        <VStack gap={3}>
          <Link
            className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-secondary transition hover:bg-card hover:text-primary dark:hover:bg-surface/8 dark:hover:text-on-accent"
            href="/"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-4"
              strokeWidth={2.2}
            />
            Back home
          </Link>
          <section>
            <p className="m-0 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
              <Trophy aria-hidden="true" className="size-4" strokeWidth={2.2} />
              Your progress
            </p>
            <h1 className="m-0 mt-3 font-heading text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
              My stats
            </h1>
            <p className="m-0 mt-3 max-w-2xl text-base leading-7 text-secondary">
              Your scores across online country rounds and daily challenges.
            </p>
          </section>
        </VStack>
      </Card>

      <section aria-label="Score summaries">
        <Grid columns={{ minWidth: 280, max: 2 }} gap={4}>
          {GAME_MODE_OPTIONS.map((option) => (
            <ModeStats
              data={data}
              key={`free-${option.id}`}
              mode={option.id}
              title="Free play"
            />
          ))}
          {GAME_MODE_OPTIONS.map((option) => (
            <ModeStats
              data={data}
              key={`daily-${option.id}`}
              mode={option.id}
              title="Daily"
            />
          ))}
        </Grid>
      </section>

      {data.freePlay.length === 0 && data.daily.length === 0 ? (
        <Card className="grid gap-2" padding={5} variant="muted">
          <Gamepad2 aria-hidden="true" className="size-5 text-accent" />
          <strong className="text-primary">Your scorecard is ready.</strong>
          <p className="m-0 text-sm text-secondary">
            Complete an online free-play round or daily challenge to start
            building your stats.
          </p>
        </Card>
      ) : null}
    </VStack>
  );
}
