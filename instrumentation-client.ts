import posthog from "posthog-js";

import { postHogProjectToken } from "@/src/lib/analytics";

if (postHogProjectToken) {
  posthog.init(postHogProjectToken, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    autocapture: false,
    capture_pageview: "history_change",
    defaults: "2026-05-30",
    disable_session_recording:
      process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY !== "true",
    session_recording: {
      maskAllInputs: true,
    },
  });
}
