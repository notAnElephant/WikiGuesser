"use client";

import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Map, Shuffle } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";

import { PageHeading } from "@/src/components/page-heading";
import { ShareChallenge } from "@/src/components/challenge/share-challenge";
import { captureAnalyticsEvent } from "@/src/lib/analytics";
import type { GameMode } from "@/src/lib/types";

const WorldMapDialog = dynamic(
  () =>
    import("@/src/components/game-shell/world-map-dialog").then(
      (module) => module.WorldMapDialog,
    ),
  { ssr: false },
);

export function ChallengeCreator({
  countryOptions,
}: {
  countryOptions: string[];
}) {
  const [country, setCountry] = useState("");
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mode, setMode] = useState<GameMode>("classic");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const creating = useRef(false);

  function pickRandomCountry() {
    const options = countryOptions.filter((option) => option !== country);
    const randomCountry = options[Math.floor(Math.random() * options.length)];
    if (randomCountry) setCountry(randomCountry);
  }

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
      captureAnalyticsEvent("challenge_created", { mode });
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
          <Button label="View results" href={url} variant="secondary" />
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
          <VStack gap={2}>
            <Selector
              hasSearch
              label="Answer country"
              options={countryOptions}
              value={country}
              onChange={setCountry}
              placeholder="Search countries"
              width="100%"
            />
            <HStack gap={2} wrap="wrap">
              <Button
                type="button"
                icon={<Map aria-hidden="true" />}
                label="Pick from map"
                isDisabled={isCreating || countryOptions.length === 0}
                onClick={() => setIsMapOpen(true)}
                variant="secondary"
              />
              <Button
                type="button"
                icon={<Shuffle aria-hidden="true" />}
                label="Random"
                isDisabled={isCreating || countryOptions.length === 0}
                onClick={pickRandomCountry}
                variant="secondary"
              />
            </HStack>
          </VStack>
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
      {isMapOpen ? (
        <Dialog isOpen onOpenChange={setIsMapOpen} padding={4} width="56rem">
          <DialogHeader
            title="Pick a country"
            subtitle="Select a country on the map. Drag to move and zoom in for smaller countries."
            onOpenChange={setIsMapOpen}
          />
          <VStack className="h-80 sm:h-96" paddingBlockStart={3}>
            <WorldMapDialog
              countryOptions={countryOptions}
              embedded
              guessedCountries={[]}
              isCountryPicker
              isExpanded={false}
              onExpandedChange={() => undefined}
              onCountryGuess={(selection) => {
                setCountry(selection);
                setIsMapOpen(false);
              }}
            />
          </VStack>
        </Dialog>
      ) : null}
      {error ? (
        <Text role="alert" className="text-error">
          {error}
        </Text>
      ) : null}
      <Button href="/" label="Back to games" variant="ghost" />
    </VStack>
  );
}
