import { GAME_MODE_OPTIONS } from "@/src/components/game-shell/config";
import type { PlayerStatsPageData } from "@/src/lib/repository/game-stats-repository";
import type { GameMode } from "@/src/lib/types";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { VStack } from "@astryxdesign/core/VStack";
import { Gamepad2 } from "lucide-react";
import { Text } from "@astryxdesign/core/Text";
import { PageHeading } from "@/src/components/page-heading";

interface PlayerStatsShellProps {
  data: PlayerStatsPageData;
}

function percentage(wins: number, played: number) {
  return played === 0 ? 0 : Math.round((wins / played) * 100);
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <VStack gap={1}>
      <Text color="secondary" type="supporting">
        {label}
      </Text>
      <Text className="text-2xl" weight="bold" hasTabularNumbers>
        {value}
      </Text>
    </VStack>
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
    <Card className="grid gap-4" elevation="none" padding={4}>
      <section aria-label={`${title} ${modeLabel} statistics`}>
        <p className="m-0 text-xs font-semibold uppercase tracking-wider text-secondary">
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
      <PageHeading
        hasBackLink
        title="My stats"
        description="Your scores across online country rounds and daily challenges."
      />
      <Text color="secondary" type="supporting">
        A win is a round where you get any points by guessing the correct
        answer.
      </Text>

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
