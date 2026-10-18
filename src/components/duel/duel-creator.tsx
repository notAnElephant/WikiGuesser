"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Share2, Swords } from "lucide-react";
import { useState } from "react";

import type {
  CategorySummary,
  EntityCategory,
  GameMode,
} from "@/src/lib/types";

interface DuelCreatorProps {
  categories: CategorySummary[];
  isSignedIn: boolean;
}

interface DuelResponse {
  inviteUrl?: string;
  url?: string;
  inviteCode?: string;
}

const modeOptions: Array<{ id: GameMode; label: string; hint: string }> = [
  { id: "classic", label: "Classic", hint: "Auto clues" },
  { id: "blurred-lines", label: "Choose Clues", hint: "Pick reveals" },
];

export function DuelCreator({ categories, isSignedIn }: DuelCreatorProps) {
  const router = useRouter();
  const category: EntityCategory = categories[0]?.id ?? "countries";
  const [mode, setMode] = useState<GameMode>("classic");
  const roundOptions = [3, 5, 10] as const;
  const [rounds, setRounds] = useState<(typeof roundOptions)[number]>(3);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createDuel() {
    if (!isSignedIn) {
      router.push("/sign-in?redirect_url=/");
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/duels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, mode, roundCount: rounds }),
      });
      const payload = (await response.json().catch(() => null)) as
        | DuelResponse
        | { error?: string }
        | null;
      if (!response.ok)
        throw new Error(
          payload && "error" in payload
            ? payload.error
            : "Could not create duel.",
        );
      const result = payload as DuelResponse;
      const url =
        result.inviteUrl ??
        result.url ??
        (result.inviteCode
          ? `${window.location.origin}/duel/${result.inviteCode}`
          : null);
      if (!url)
        throw new Error("The duel invite link was missing from the response.");
      setInviteUrl(url);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create duel.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareInvite() {
    if (!inviteUrl) return;
    if (navigator.share)
      await navigator.share({
        title: "WikiGuesser duel",
        text: "Challenge me to a WikiGuesser duel.",
        url: inviteUrl,
      });
    else await copyInvite();
  }

  return (
    <Card
      className="overflow-hidden"
      aria-labelledby="duel-creator-title"
      elevation="low"
      padding={0}
    >
      <section className="grid lg:grid-cols-[minmax(230px,0.72fr)_minmax(0,1.6fr)]">
        <header className="flex flex-col justify-center border-b border-border p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <Swords aria-hidden="true" className="mb-4 size-6 text-accent" />
          <p className="m-0 text-xs font-bold uppercase tracking-wider text-accent">
            Challenge a friend
          </p>
          <h2
            id="duel-creator-title"
            className="m-0 mt-1 font-heading text-2xl font-semibold tracking-tight text-primary sm:text-3xl"
          >
            Set up a duel
          </h2>
          <p className="m-0 mt-2 max-w-prose text-sm leading-6 text-secondary">
            Pick the mode and number of rounds, then send your friend an invite.
          </p>
        </header>

        <section aria-label="Duel settings" className="grid min-w-0 content-center gap-5 p-5 sm:p-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <fieldset className="grid min-w-0 gap-2 text-sm font-semibold text-secondary">
              <legend>Game mode</legend>
              <SegmentedControl
                label="Game mode"
                layout="fill"
                onChange={(value) => setMode(value as GameMode)}
                value={mode}
              >
                {modeOptions.map((item) => (
                  <SegmentedControlItem
                    key={item.id}
                    label={item.label}
                    value={item.id}
                  />
                ))}
              </SegmentedControl>
            </fieldset>
            <fieldset className="grid min-w-0 gap-2 text-sm font-semibold text-secondary">
              <legend>Rounds</legend>
              <SegmentedControl
                label="Number of rounds"
                layout="fill"
                onChange={(value) => setRounds(Number(value) as typeof rounds)}
                value={String(rounds)}
              >
                {roundOptions.map((count) => (
                  <SegmentedControlItem
                    key={count}
                    label={`${count}`}
                    value={String(count)}
                  />
                ))}
              </SegmentedControl>
            </fieldset>
          </section>

          {inviteUrl ? (
            <section className="grid min-w-0 gap-3 border-t border-border pt-5">
              <p className="m-0 text-sm font-semibold text-primary">
                Your duel is ready. Send this link to your opponent.
              </p>
              <section className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <TextInput
                  isLabelHidden
                  isReadOnly
                  label="Duel invite link"
                  value={inviteUrl}
                  width="100%"
                />
                <Button
                  icon={copied ? <Check /> : <Copy />}
                  label={copied ? "Copied" : "Copy"}
                  onClick={() => void copyInvite()}
                  tooltip="Copy invite link"
                  variant="secondary"
                />
                <Button
                  icon={<Share2 />}
                  label="Share"
                  onClick={() => void shareInvite()}
                  variant="primary"
                />
              </section>
              <a
                href={inviteUrl}
                className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-accent"
              >
                <Link2 aria-hidden="true" className="size-4" />
                Open duel
              </a>
            </section>
          ) : (
            <footer className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="m-0 text-sm text-secondary">
                Countries · {rounds} rounds
              </p>
              <Button
                className="w-full sm:w-auto"
                icon={<Swords />}
                isLoading={isCreating}
                label="Create invite link"
                onClick={() => void createDuel()}
                variant="primary"
              />
            </footer>
          )}
          {error ? (
            <p role="alert" className="m-0 text-sm font-medium text-error">
              {error}
            </p>
          ) : null}
        </section>
      </section>
    </Card>
  );
}
