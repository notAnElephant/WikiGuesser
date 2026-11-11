"use client";

import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { Copy, Share2 } from "lucide-react";
import { useState } from "react";

export async function shareChallenge(url: string, text: string, copy = false) {
  if (!copy && navigator.share) {
    await navigator.share({ title: "WikiGuesser challenge", text, url });
    return "";
  }
  await navigator.clipboard.writeText(`${text}\n${url}`);
  return "Copied. Ready to send.";
}

export function ShareChallenge({
  url,
  text = "A country challenge for you. Can you guess it?",
}: {
  url: string;
  text?: string;
}) {
  const [message, setMessage] = useState("");

  async function share(copy: boolean) {
    try {
      setMessage(await shareChallenge(url, text, copy));
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setMessage(
          "Sharing failed. You can copy the link from the field below.",
        );
      }
    }
  }

  return (
    <VStack gap={2}>
      <TextInput isReadOnly label="Challenge link" value={url} width="100%" />
      <HStack gap={2} wrap="wrap">
        <IconButton
          icon={<Share2 aria-hidden="true" />}
          label="Share challenge"
          tooltip="Share challenge"
          onClick={() => void share(false)}
          variant="primary"
        />
        <IconButton
          icon={<Copy aria-hidden="true" />}
          label="Copy challenge link"
          tooltip="Copy challenge link"
          onClick={() => void share(true)}
          variant="secondary"
        />
      </HStack>
      {message ? <Text role="status">{message}</Text> : null}
    </VStack>
  );
}
