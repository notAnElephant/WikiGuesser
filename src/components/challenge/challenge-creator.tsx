"use client";

import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useRef, useState } from "react";

import { PageHeading } from "@/src/components/page-heading";
import { ShareChallenge } from "@/src/components/challenge/share-challenge";
import type { GameMode } from "@/src/lib/types";

export function ChallengeCreator({
  countryOptions,
}: {
  countryOptions: string[];
}) {
  const [country, setCountry] = useState("");
  const [mode, setMode] = useState<GameMode>("classic");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const creating = useRef(false);

  async function create() {
    if (!country || creating.current) return;
    creating.current = true;
    setIsCreating(true);
    setError("");
    try {
      const response = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, mode }),
      });
      const data = (await response.json()) as { path?: string; error?: string };
      if (!response.ok || !data.path)
        throw new Error(data.error ?? "Could not create challenge.");
      setUrl(new URL(data.path, window.location.origin).href);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not create challenge.",
      );
    } finally {
      creating.current = false;
      setIsCreating(false);
    }
  }

  return (
    <VStack gap={5}>
      <PageHeading title="Create a challenge" />
      <Text color="secondary">
        Pick the answer and send the puzzle to your friends. Everyone gets their
        own attempt.
      </Text>
      {url ? (
        <VStack gap={4}>
          <Text>
            Your challenge is ready. The shared link keeps the answer a secret.
          </Text>
          <ShareChallenge url={url} />
          <Button
            label="Create another challenge"
            onClick={() => {
              setUrl(null);
              setCountry("");
            }}
            variant="secondary"
          />
        </VStack>
      ) : (
        <VStack
          as="form"
          gap={4}
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <Selector
            hasSearch
            label="Answer country"
            options={countryOptions}
            value={country}
            onChange={setCountry}
            placeholder="Search countries"
            width="100%"
          />
          <VStack gap={2}>
            <Text weight="semibold">Game mode</Text>
            <SegmentedControl
              label="Game mode"
              layout="fill"
              value={mode}
              onChange={(value) => setMode(value as GameMode)}
            >
              <SegmentedControlItem value="classic" label="Classic" />
              <SegmentedControlItem
                value="blurred-lines"
                label="Choose Clues"
              />
            </SegmentedControl>
            <Text color="secondary">
              {mode === "classic"
                ? "Each miss reveals the next clue."
                : "Choose a clue, then make a guess."}
            </Text>
          </VStack>
          <Text color="secondary">
            One scored attempt per player. Challenge scores stay separate from
            regular stats and daily leaderboards.
          </Text>
          <Button
            type="submit"
            isDisabled={!country || isCreating}
            isLoading={isCreating}
            label="Create challenge link"
            variant="primary"
          />
        </VStack>
      )}
      {error ? (
        <Text role="alert" className="text-error">
          {error}
        </Text>
      ) : null}
      <Button href="/" label="Back to games" variant="ghost" />
    </VStack>
  );
}
