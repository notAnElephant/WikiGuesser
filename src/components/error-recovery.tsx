"use client";

import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { VStack } from "@astryxdesign/core/VStack";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import {
  captureAnalyticsEvent,
  captureAnalyticsException,
} from "@/src/lib/analytics";
import {
  claimChunkReload,
  isChunkLoadError,
} from "@/src/lib/chunk-load-recovery";

export function ErrorRecovery({
  boundary,
  error,
  retry,
}: {
  boundary: "route" | "global";
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [isReloading, setIsReloading] = useState(false);
  const chunkLoadError = isChunkLoadError(error);

  useEffect(() => {
    const willReload =
      chunkLoadError && claimChunkReload(() => window.sessionStorage);

    captureAnalyticsException(error, {
      error_boundary: boundary,
      chunk_load_error: chunkLoadError,
      auto_reload: willReload,
    });

    if (willReload) {
      captureAnalyticsEvent("chunk_load_reload", { boundary });
      setIsReloading(true);
      window.location.reload();
    }
  }, [boundary, chunkLoadError, error]);

  return (
    <VStack align="center" justify="center" minHeight="60vh" padding={6}>
      <EmptyState
        actions={
          <Button
            icon={<RefreshCw aria-hidden="true" />}
            isLoading={isReloading}
            label="Try again"
            onClick={
              // A failed chunk stays failed in this page, so only a full
              // reload fetches the new build.
              chunkLoadError ? () => window.location.reload() : retry
            }
            variant="primary"
          />
        }
        description={
          isReloading
            ? "A new version of WikiGuesser is available. Reloading the page…"
            : "WikiGuesser hit an unexpected error. Try again to keep playing."
        }
        headingLevel={1}
        icon={<TriangleAlert />}
        title={isReloading ? "Updating WikiGuesser" : "Something went wrong"}
      />
    </VStack>
  );
}
