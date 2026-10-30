"use client";

import { Button } from "@astryxdesign/core/Button";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { TextArea } from "@astryxdesign/core/TextArea";
import { VStack } from "@astryxdesign/core/VStack";
import { useState } from "react";

import { useAppToast } from "@/src/components/app-toaster";
import { captureAnalyticsEvent } from "@/src/lib/analytics";

export type FeedbackKind =
  | "positive"
  | "bug"
  | "content_issue"
  | "confusing"
  | "feature_idea"
  | "other";

export interface FeedbackContext {
  source: "global" | "round-result" | "clue";
  gameType?: "daily" | "free_play";
  category?: "countries" | "cities" | "people";
  mode?: "classic" | "blurred-lines";
  outcome?: "win" | "loss";
  score?: number;
  cluesRevealed?: number;
  clueKey?: string;
  clueLabel?: string;
}

const feedbackOptions: ReadonlyArray<{
  description: string;
  label: string;
  value: FeedbackKind;
}> = [
  { value: "positive", label: "I enjoyed it", description: "Tell us what worked." },
  { value: "bug", label: "Something is broken", description: "A bug or unexpected behavior." },
  { value: "content_issue", label: "A clue or answer is wrong", description: "Report inaccurate game content." },
  { value: "confusing", label: "Something was confusing", description: "Help us make the game clearer." },
  { value: "feature_idea", label: "I have an idea", description: "Suggest an improvement or new feature." },
  { value: "other", label: "Something else", description: "Any other thought." },
];

interface FeedbackFormProps {
  context: FeedbackContext;
  onSubmitted?: () => void;
}

export function FeedbackForm({ context, onSubmitted }: FeedbackFormProps) {
  const toast = useAppToast();
  const [kind, setKind] = useState<FeedbackKind>("positive");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitFeedback() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        body: JSON.stringify({ context, kind, message }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to send feedback.");
      }

      captureAnalyticsEvent("feedback_submitted", {
        feedback_kind: kind,
        source: context.source,
      });
      setMessage("");
      onSubmitted?.();
      requestAnimationFrame(() => {
        toast.success("Thanks, your feedback was sent.", {
          id: "feedback-submitted",
        });
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send feedback.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <VStack as="form" gap={4} onSubmit={(event) => { event.preventDefault(); void submitFeedback(); }}>
      <RadioList label="What would you like to share?" onChange={(value) => setKind(value as FeedbackKind)} value={kind}>
        {feedbackOptions.map((option) => (
          <RadioListItem description={option.description} key={option.value} label={option.label} value={option.value} />
        ))}
      </RadioList>
      <TextArea description="Details help us understand what happened. Your gameplay context is included automatically." isOptional label="Anything else to add?" maxLength={2_000} onChange={setMessage} placeholder="Share your thoughts..." rows={4} value={message} width="100%" />
      <Button isLoading={isSubmitting} label="Send feedback" type="submit" variant="primary" width="100%" />
    </VStack>
  );
}
