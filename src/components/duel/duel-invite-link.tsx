"use client";

import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { StackItem } from "@astryxdesign/core/Stack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

export function DuelInviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const copyLabel = copied ? "Invite link copied" : "Copy invite link";

  async function copyInvite() {
    setError("");
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy the invite link.");
    }
  }

  async function shareInvite() {
    if (!navigator.share) return copyInvite();

    setError("");
    try {
      await navigator.share({ title: "WikiGuesser duel", url });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        await copyInvite();
      }
    }
  }

  return (
    <>
      <HStack gap={2} align="center">
        <StackItem size="fill">
          <TextInput
            isLabelHidden
            isReadOnly
            label="Duel invite link"
            value={url}
            width="100%"
          />
        </StackItem>
        <IconButton
          icon={
            copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />
          }
          label={copyLabel}
          tooltip={copyLabel}
          onClick={() => void copyInvite()}
        />
        <IconButton
          icon={<Share2 aria-hidden="true" />}
          label="Share invite"
          tooltip="Share invite"
          onClick={() => void shareInvite()}
        />
      </HStack>
      {error ? (
        <p role="alert" className="m-0 text-sm text-error">
          {error}
        </p>
      ) : null}
    </>
  );
}
