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
import { Icon } from "@astryxdesign/core/Icon";
import { useState } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";

import { PageHeading } from "@/src/components/page-heading";
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
    <VStack gap={5}>
      <PageHeading
        hasBackLink
        title={
          period === "today" ? "Today's leaderboard" : "All-time leaderboard"
        }
        description={
          period === "today"
            ? "See the top scores from today's challenge."
            : "See the top players across every completed challenge."
        }
        meta={
          <HStack gap={2} align="center">
            <Icon color="secondary" icon={CalendarDays} size="sm" />
            <time className="text-sm text-secondary" dateTime={data.dayKey}>
              {data.dayKey}
            </time>
          </HStack>
        }
      />
      <Card padding={4} elevation="none">
        <VStack gap={4}>
          <VStack gap={2}>
            <Text color="secondary" type="supporting" weight="semibold">
              Period
            </Text>
            <SegmentedControl
              layout="fill"
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
          </VStack>
          <VStack gap={2}>
            <Text color="secondary" type="supporting" weight="semibold">
              Game mode
            </Text>
            <SegmentedControl
              layout="fill"
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
          </VStack>

          <VStack gap={3} paddingBlock={2}>
            <Text color="secondary" type="supporting" weight="semibold">
              {selectedModeMeta.label}
            </Text>
            {period === "total" ? (
              <Text color="secondary" type="supporting" weight="semibold">
                Games · Score
              </Text>
            ) : null}
            <List
              aria-label={`${selectedModeMeta.label} rankings`}
              density="balanced"
              hasDividers
            >
              {entries.length === 0 ? (
                <ListItem label="No scores yet." />
              ) : (
                entries.map((entry, index) => (
                  <ListItem
                    description={
                      period === "total"
                        ? `${entry.roundsWon ?? 0} ${(entry.roundsWon ?? 0) === 1 ? "win" : "wins"}`
                        : undefined
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
          {period === "total" ? (
            <Text color="secondary" type="supporting">
              A win is a round where the player gets points by guessing the
              correct answer.
            </Text>
          ) : null}

          <Button
            href="/"
            icon={<ArrowLeft aria-hidden="true" />}
            label="Play a round"
            variant="primary"
            width="100%"
          />
        </VStack>
      </Card>
    </VStack>
  );
}
