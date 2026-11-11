"use client";

import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import type {
  ChallengeReplay,
  ChallengeReplayOutcome,
  ChallengeReplaySummary,
} from "@/src/lib/types";

const WorldMapDialog = dynamic(
  () =>
    import("@/src/components/game-shell/world-map-dialog").then(
      (module) => module.WorldMapDialog,
    ),
  { ssr: false },
);

const outcomeLabels: Record<ChallengeReplayOutcome, string> = {
  SOLVED: "Solved",
  GAVE_UP: "Gave up",
  OUT_OF_CLUES: "Ran out of clues",
};

function Replay({ replay }: { replay: ChallengeReplay }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const finished = step === replay.guesses.length;
  const guess = replay.guesses[step];
  const correct =
    replay.outcome === "SOLVED" && step === replay.guesses.length - 1;

  useEffect(() => {
    if (!playing || finished) return;
    const timer = window.setTimeout(() => {
      setStep(step + 1);
      if (step + 1 === replay.guesses.length) setPlaying(false);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [finished, playing, replay.guesses.length, step]);

  return (
    <VStack gap={3}>
      <VStack gap={1} aria-live="polite" aria-atomic="true">
        {guess ? (
          <>
            <Text color="secondary">
              Guess {step + 1} of {replay.guesses.length}
            </Text>
            <Text weight="semibold">
              {guess.name} · {correct ? "Correct" : "Incorrect"}
            </Text>
            {guess.direction ? (
              <Text>
                Answer is {guess.direction} of {guess.name}.
              </Text>
            ) : null}
          </>
        ) : (
          <Text weight="semibold">
            {outcomeLabels[replay.outcome]} · {replay.answer} · {replay.score}{" "}
            pts
          </Text>
        )}
      </VStack>
      {replay.guesses.length > 0 ? (
        <HStack gap={2}>
          <Button
            label="Previous"
            size="sm"
            isDisabled={step === 0}
            onClick={() => {
              setPlaying(false);
              setStep(step - 1);
            }}
          />
          <Button
            label={playing ? "Pause" : finished ? "Play again" : "Play"}
            size="sm"
            variant="primary"
            onClick={() => {
              if (finished) setStep(0);
              setPlaying(!playing);
            }}
          />
          <Button
            label="Next"
            size="sm"
            isDisabled={finished}
            onClick={() => {
              setPlaying(false);
              setStep(step + 1);
            }}
          />
        </HStack>
      ) : null}
      <WorldMapDialog
        focusedGuess={guess?.mapData ?? null}
        guessedCountries={replay.guesses
          .slice(0, step + 1)
          .flatMap(({ mapData }) => (mapData ? [mapData] : []))}
        isExpanded={false}
        onExpandedChange={() => undefined}
        presentation="result"
        solutionCountry={finished || correct ? replay.solutionCountry : null}
      />
    </VStack>
  );
}

export function ChallengeResults({ endpoint }: { endpoint: string }) {
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
        if (!controller.signal.aborted) setData(result);
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

  const title = (
    <Heading level={2}>
      {selected ? `${selected.playerLabel} replay` : "Challenge results"}
    </Heading>
  );
  return (
    <VStack gap={3} as="section">
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
                <Button
                  label="Watch replay"
                  aria-label={`Watch replay for ${attempt.playerLabel}`}
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
      ) : (
        <Replay replay={data} />
      )}
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
