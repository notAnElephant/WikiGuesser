"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
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
  const [category, setCategory] = useState<EntityCategory>(
    categories[0]?.id ?? "countries",
  );
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
      className="grid gap-5 p-5 sm:p-7"
      aria-labelledby="duel-creator-title"
      elevation="low"
      padding={0}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-bg/10 text-accent ">
          <Swords aria-hidden="true" className="size-5" />
        </div>
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-wider text-accent ">
            Challenge a friend
          </p>
          <h2
            id="duel-creator-title"
            className="mt-1 font-heading text-3xl font-semibold tracking-tight text-primary"
          >
            Set up a duel
          </h2>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Selector
          label="Category"
          onChange={(value) => setCategory(value as EntityCategory)}
          options={categories.map((item) => ({
            label: item.label,
            value: item.id,
          }))}
          size="lg"
          value={category}
          width="100%"
        />
        <fieldset className="grid gap-2 text-sm font-semibold text-secondary ">
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
        <fieldset className="grid gap-2 text-sm font-semibold text-secondary ">
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
                label={`${count} games`}
                value={String(count)}
              />
            ))}
          </SegmentedControl>
        </fieldset>
      </div>
      {inviteUrl ? (
        <div className="grid gap-3 rounded-2xl border border-accent-bg/20 bg-accent-bg/7 p-4">
          <p className="m-0 text-sm font-semibold text-secondary ">
            Your duel is ready. Send this link to your opponent.
          </p>
          <div className="flex gap-2">
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
          </div>
          <a
            href={inviteUrl}
            className="inline-flex items-center gap-1 text-sm font-semibold text-accent "
          >
            <Link2 className="size-4" />
            Open duel
          </a>
        </div>
      ) : (
        <Button
          icon={<Swords />}
          isLoading={isCreating}
          label="Create duel link"
          onClick={() => void createDuel()}
          variant="primary"
          width="100%"
        />
      )}
      {error ? (
        <p role="alert" className="m-0 text-sm font-medium text-error">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
