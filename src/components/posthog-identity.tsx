"use client";

import { useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";

import { isPostHogConfigured } from "@/src/lib/analytics";

export function PostHogIdentity() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isPostHogConfigured) {
      return;
    }

    if (isSignedIn && userId) {
      if (identifiedUserId.current !== userId) {
        posthog.identify(userId);
        identifiedUserId.current = userId;
      }

      return;
    }

    if (identifiedUserId.current) {
      posthog.reset();
      identifiedUserId.current = null;
    }
  }, [isLoaded, isSignedIn, userId]);

  return null;
}
