"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";

import { useAppToast } from "@/src/components/app-toaster";
import { useOptionalAstryxTheme } from "@/src/components/theme-provider";
import { captureAnalyticsEvent } from "@/src/lib/analytics";

type RatingDevice = "mobile" | "desktop";

function getRatingDevice(): RatingDevice {
  return window.matchMedia("(min-width: 640px)").matches
    ? "desktop"
    : "mobile";
}

interface ThemeRatingPromptProps {
  onDismiss: () => void;
}

export function ThemeRatingPrompt({ onDismiss }: ThemeRatingPromptProps) {
  const toast = useAppToast();
  const theme = useOptionalAstryxTheme();
  const themeName = theme?.themeName ?? "chocolate";
  const [device, setDevice] = useState<RatingDevice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const nextDevice = getRatingDevice();
    setDevice(nextDevice);
    captureAnalyticsEvent("theme_rating_prompt_shown", {
      device: nextDevice,
      theme: themeName,
    });
  }, [themeName]);

  async function submitRating(score: number) {
    if (!device) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/theme-ratings", {
        body: JSON.stringify({ device, score, theme: themeName }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save rating.");
      }

      captureAnalyticsEvent("theme_rating_submitted", {
        device,
        score,
        theme: themeName,
      });
      onDismiss();
      requestAnimationFrame(() => {
        toast.success("Thanks, your feedback was sent.", {
          id: "theme-rating-submitted",
        });
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save rating.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <VStack className="mt-4 border-t pt-4" gap={2}>
      <VStack gap={0}>
        <Text weight="semibold">How does this design feel?</Text>
        <Text color="secondary" type="supporting">
          Your rating helps us choose the best look. Optional.
        </Text>
      </VStack>
      <HStack gap={1}>
        {[1, 2, 3, 4, 5].map((score) => (
          <IconButton
            className="min-h-11 min-w-11"
            icon={<Star aria-hidden="true" className="size-5" />}
            isDisabled={isSubmitting || !device}
            key={score}
            label={`Rate this design ${score} out of 5 stars`}
            onClick={() => void submitRating(score)}
            tooltip={`${score} star${score === 1 ? "" : "s"}`}
            variant="secondary"
          />
        ))}
      </HStack>
      <Button
        isDisabled={isSubmitting}
        label="Skip for now"
        onClick={onDismiss}
        variant="ghost"
      />
    </VStack>
  );
}
