import posthog from "posthog-js";

import { isOpaqueCrossOriginException } from "@/src/lib/error-tracking";
import {
  flushOfflineAnalytics,
  postHogHost,
  postHogProjectToken,
} from "@/src/lib/analytics";

if (postHogProjectToken) {
  posthog.init(postHogProjectToken, {
    api_host: postHogHost,
    autocapture: false,
    before_send: (event) =>
      isOpaqueCrossOriginException(event) ? null : event,
    capture_pageview: "history_change",
    capture_performance: true,
    defaults: "2026-05-30",
    disable_session_recording:
      process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY !== "true",
    session_recording: {
      maskAllInputs: true,
    },
  });
  window.addEventListener("online", flushOfflineAnalytics);
  void flushOfflineAnalytics();
}
