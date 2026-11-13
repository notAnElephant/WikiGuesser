"use client";

import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import {
  ArrowLeft,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { GamePlayView } from "@/src/components/game-shell/play-view";
import { getMessageAppearance } from "@/src/components/game-shell/utils";
import { captureAnalyticsEvent } from "@/src/lib/analytics";
import { getChallengeReplaySteps } from "@/src/lib/game/challenge-replay";

import type {
  ChallengeReplay,
  ChallengeReplayOutcome,
  ChallengeReplaySummary,
} from "@/src/lib/types";

const outcomeLabels: Record<ChallengeReplayOutcome, string> = {
  SOLVED: "Solved",
  GAVE_UP: "Gave up",
  OUT_OF_CLUES: "Ran out of clues",
};

function Replay({
  replay,
  playerLabel,
  onClose,
}: {
  replay: ChallengeReplay;
  playerLabel: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const { steps, approximate } = getChallengeReplaySteps(replay);
  const frame = steps[step];
  const finished = step === steps.length - 1;
  const guesses = replay.guesses.slice(0, frame.guessCount);
  const guess = frame.kind === "guess" ? guesses.at(-1) : undefined;
  const correct = Boolean(
    guess &&
    replay.outcome === "SOLVED" &&
    guesses.length === replay.guesses.length,
  );
  const revealedKeys = replay.revealedClueKeys.slice(0, frame.clueCount);
  const latestClueKey = revealedKeys.at(-1);
  const clues = replay.clues.map((clue) => {
    const isRevealed = revealedKeys.includes(clue.key);
    return {
      ...clue,
      isRevealed,
      value: isRevealed ? clue.value : null,
      prefetchedValue: isRevealed ? clue.prefetchedValue : "",
    };
  });
  const visibleClues = revealedKeys.flatMap((key) =>
    clues.filter((clue) => clue.key === key),
  );
  const playbackLabel = playing ? "Pause" : finished ? "Play again" : "Play";
  const PlaybackIcon = playing ? Pause : finished ? RotateCcw : Play;

  useEffect(() => {
    if (!playing || finished) return;
    const timer = window.setTimeout(() => {
      setStep(step + 1);
      if (step + 2 === steps.length) setPlaying(false);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [finished, playing, step, steps.length]);

  return (
    <GamePlayView
      availableCountryOptions={[]}
      canSubmitGuess={false}
      clearForCategoryChoice={onClose}
      currentCategory="countries"
      currentCategoryLabel="Countries"
      currentClues={clues}
      currentMode={replay.mode}
      displayScore={replay.score}
      flowLabel="Challenge replay"
      giveUpRound={() => undefined}
      guess=""
      guessedEntities={guesses}
      guessButtonLabel="Guess"
      handleGuessSubmit={(event) => event.preventDefault()}
      handleMapGuess={() => undefined}
      isBusy={false}
      isCountryRound
      message=""
      messageRevision={0}
      replay={{
        focusedGuess: guesses.at(-1)?.mapData ?? null,
        latestClueKey,
      }}
      result={null}
      revealClue={() => undefined}
      revealedCount={frame.clueCount}
      round={null}
      setGuess={() => undefined}
      showHomeButton={false}
      showRestartButton={false}
      solutionCountry={finished || correct ? replay.solutionCountry : null}
      startRound={() => undefined}
      statusAppearance={getMessageAppearance("", null)}
      validationMessage={null}
      view="round"
      visibleClassicClues={visibleClues}
      header={
        <VStack gap={2} paddingBlock={2}>
          <HStack justify="between" align="center" gap={2} wrap="wrap">
            <HStack gap={2} align="center">
              <IconButton
                icon={<ArrowLeft aria-hidden="true" />}
                label="Back to results"
                tooltip="Back to results"
                onClick={onClose}
              />
              <Text weight="semibold">{playerLabel} replay</Text>
            </HStack>
            {steps.length > 1 ? (
              <HStack gap={2}>
                <IconButton
                  icon={<SkipBack aria-hidden="true" />}
                  label="Previous"
                  tooltip="Previous step"
                  isDisabled={step === 0}
                  onClick={() => {
                    setPlaying(false);
                    setStep(step - 1);
                  }}
                />
                <IconButton
                  icon={<PlaybackIcon aria-hidden="true" />}
                  label={playbackLabel}
                  tooltip={playbackLabel}
                  variant="primary"
                  onClick={() => {
                    if (finished) setStep(0);
                    setPlaying(!playing);
                  }}
                />
                <IconButton
                  icon={<SkipForward aria-hidden="true" />}
                  label="Next"
                  tooltip="Next step"
                  isDisabled={finished}
                  onClick={() => {
                    setPlaying(false);
                    setStep(step + 1);
                  }}
                />
              </HStack>
            ) : null}
          </HStack>
          <Text role="status">
            {finished
              ? `${outcomeLabels[replay.outcome]} · ${replay.answer} · ${replay.score} pts`
              : guess
                ? `${guess.name} · ${correct ? "Correct" : "Incorrect"}`
                : `Clue revealed · ${visibleClues.at(-1)?.label}`}
          </Text>
          {approximate ? (
            <Text color="secondary">
              Clue timing is approximate for this older attempt.
            </Text>
          ) : null}
        </VStack>
      }
    />
  );
}

export function ChallengeResults({
  endpoint,
  overview,
}: {
  endpoint: string;
  overview: ReactNode;
}) {
  const [selected, setSelected] = useState<ChallengeReplaySummary | null>(null);
  const [data, setData] = useState<
    ChallengeReplaySummary[] | ChallengeReplay | null
  >(null);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const url = selected
      ? `${endpoint}?attempt=${encodeURIComponent(selected.id)}`
      : endpoint;
    async function load() {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not load challenge results.");
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (selected && !Array.isArray(result)) {
          captureAnalyticsEvent("challenge_replay_viewed", {
            mode: (result as ChallengeReplay).mode,
          });
        }
        setData(result);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [endpoint, refresh, selected]);

  function open(attempt: ChallengeReplaySummary | null) {
    setData(null);
    setError(false);
    setSelected(attempt);
  }

  function reload() {
    setData(null);
    setError(false);
    setRefresh((value) => value + 1);
  }

  if (selected && data && !Array.isArray(data)) {
    return (
      <Replay
        replay={data}
        playerLabel={selected.playerLabel}
        onClose={() => open(null)}
      />
    );
  }

  const title = (
    <Heading level={2}>
      {selected ? `${selected.playerLabel} replay` : "Challenge results"}
    </Heading>
  );
  return (
    <VStack gap={3} as="section" className="mx-auto w-full max-w-2xl">
      {overview}
      {selected ? (
        <Button
          label="Back to results"
          variant="ghost"
          onClick={() => open(null)}
        />
      ) : null}
      {Array.isArray(data) && data.length > 0 ? (
        <List header={title} hasDividers>
          {data.map((attempt) => (
            <ListItem
              key={attempt.id}
              label={attempt.playerLabel}
              description={
                <Text color="secondary">
                  {outcomeLabels[attempt.outcome]} · {attempt.score} pts ·{" "}
                  {attempt.guessCount}{" "}
                  {attempt.guessCount === 1 ? "guess" : "guesses"} ·{" "}
                  {new Date(attempt.completedAt).toLocaleString()}
                </Text>
              }
              endContent={
                <IconButton
                  icon={<Play aria-hidden="true" />}
                  label={`Watch replay for ${attempt.playerLabel}`}
                  tooltip="Watch replay"
                  size="sm"
                  onClick={() => open(attempt)}
                />
              }
            />
          ))}
        </List>
      ) : (
        title
      )}
      {error ? (
        <Text role="alert">
          Could not load {selected ? "this replay" : "challenge results"}.
        </Text>
      ) : !data ? (
        <Text role="status">Loading {selected ? "replay" : "results"}…</Text>
      ) : Array.isArray(data) ? (
        data.length === 0 ? (
          <Text>No completed attempts yet.</Text>
        ) : null
      ) : null}
      {error || (!selected && data) ? (
        <Button
          label={error ? "Retry" : "Refresh results"}
          variant="ghost"
          onClick={reload}
        />
      ) : null}
    </VStack>
  );
}
