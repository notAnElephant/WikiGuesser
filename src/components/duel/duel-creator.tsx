"use client";

import { useRouter } from "next/navigation";
import { Check, Copy, Link2, LoaderCircle, Share2, Swords } from "lucide-react";
import { useState } from "react";

import type {
  CategorySummary,
  EntityCategory,
  GameMode,
} from "@/src/lib/types";
import {
  primaryButtonClass,
  secondaryButtonClass,
  surfaceClass,
} from "@/src/components/game-shell/config";

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
    <section
      className={`${surfaceClass} grid gap-5 p-5 sm:p-7`}
      aria-labelledby="duel-creator-title"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#0f766e]/10 text-[#0f766e] dark:bg-[#24d4c2]/12 dark:text-[#55e7d5]">
          <Swords aria-hidden="true" className="size-5" />
        </div>
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-[#0f766e] dark:text-[#55e7d5]">
            Challenge a friend
          </p>
          <h2
            id="duel-creator-title"
            className="mt-1 font-serif-display text-3xl font-semibold tracking-[-0.04em] text-[#1f1b17] dark:text-[#f5f7fb]"
          >
            Set up a duel
          </h2>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-[#4e4740] dark:text-[#c5cfda]">
          Category
          <select
            className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3 font-medium text-[#1f1b17] outline-none focus:border-[#0f766e] dark:border-white/10 dark:bg-white/6 dark:text-[#f5f7fb]"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as EntityCategory)
            }
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="grid gap-2 text-sm font-semibold text-[#4e4740] dark:text-[#c5cfda]">
          <legend>Game mode</legend>
          <div className="grid grid-cols-2 gap-2">
            {modeOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={mode === item.id}
                onClick={() => setMode(item.id)}
                className={`${mode === item.id ? primaryButtonClass : secondaryButtonClass} px-3 py-2.5`}
              >
                <span>{item.label}</span>
                <span className="sr-only"> — {item.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-2 text-sm font-semibold text-[#4e4740] dark:text-[#c5cfda]">
          <legend>Rounds</legend>
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-2xl font-semibold tracking-[-0.03em] text-[#1f1b17] dark:text-[#f5f7fb]">
                {rounds} games
              </span>
              <span className="text-xs font-medium text-[#756d64] dark:text-[#9daab7]">
                Choose your distance
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={roundOptions.length - 1}
              step={1}
              value={roundOptions.indexOf(rounds)}
              onChange={(event) =>
                setRounds(roundOptions[Number(event.target.value)] ?? 3)
              }
              aria-label="Number of rounds"
              aria-valuetext={`${rounds} games`}
              className="h-2 w-full cursor-pointer accent-[#0f766e] dark:accent-[#55e7d5]"
            />
            <div className="grid grid-cols-3 text-xs font-semibold text-[#756d64] dark:text-[#9daab7]">
              {roundOptions.map((count) => (
                <span
                  key={count}
                  className={
                    rounds === count
                      ? "text-[#0f766e] dark:text-[#55e7d5]"
                      : undefined
                  }
                >
                  {count}
                </span>
              ))}
            </div>
          </div>
        </fieldset>
      </div>
      {inviteUrl ? (
        <div className="grid gap-3 rounded-2xl border border-[#0f766e]/20 bg-[#0f766e]/7 p-4">
          <p className="m-0 text-sm font-semibold text-[#1f625c] dark:text-[#9ef1e5]">
            Your duel is ready. Send this link to your opponent.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white/75 px-3 py-2 text-sm text-[#4e4740] outline-none dark:border-white/10 dark:bg-white/6 dark:text-[#dce6ee]"
            />
            <button
              type="button"
              onClick={() => void copyInvite()}
              className={secondaryButtonClass}
              aria-label="Copy invite link"
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => void shareInvite()}
              className={primaryButtonClass}
              aria-label="Share invite link"
            >
              <Share2 className="size-4" />
              Share
            </button>
          </div>
          <a
            href={inviteUrl}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#0f766e] dark:text-[#55e7d5]"
          >
            <Link2 className="size-4" />
            Open duel
          </a>
        </div>
      ) : (
        <button
          type="button"
          disabled={isCreating}
          onClick={() => void createDuel()}
          className={`${primaryButtonClass} w-full sm:w-fit`}
        >
          {isCreating ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Swords className="size-4" />
          )}
          {isCreating ? "Creating…" : "Create duel link"}
        </button>
      )}
      {error ? (
        <p
          role="alert"
          className="m-0 text-sm font-medium text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
