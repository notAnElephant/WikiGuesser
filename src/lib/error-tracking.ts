import type { CaptureResult } from "posthog-js";

const OPAQUE_SCRIPT_ERROR_MESSAGES = new Set(["Script error", "Script error."]);

type CapturedException = {
  value?: string;
  stacktrace?: {
    frames?: unknown[];
  };
};

/**
 * A cross-origin script failure reaches `window.onerror` with no message, file,
 * line, or stack. The browser withholds the detail and PostHog captures a single
 * "Script error." exception with no frames. Such an event is not actionable, so
 * drop it and keep error tracking free of opaque placeholders.
 */
export function isOpaqueCrossOriginException(
  event: CaptureResult | null,
): boolean {
  if (event?.event !== "$exception") {
    return false;
  }

  const exceptions = event.properties?.$exception_list as
    | CapturedException[]
    | undefined;

  if (!Array.isArray(exceptions) || exceptions.length !== 1) {
    return false;
  }

  const [exception] = exceptions;
  const message = exception?.value?.trim() ?? "";
  const frames = exception?.stacktrace?.frames;
  const hasNoFrames = !Array.isArray(frames) || frames.length === 0;

  return OPAQUE_SCRIPT_ERROR_MESSAGES.has(message) && hasNoFrames;
}
