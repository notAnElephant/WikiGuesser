import { env } from "@/src/lib/env";

interface FeedbackNotificationInput {
  context: unknown;
  id: string;
  kind: string;
  message: string | null;
  path: string | null;
}

function formatContext(context: unknown) {
  return context ? JSON.stringify(context, null, 2) : "Not available";
}

export function createFeedbackNotification(input: FeedbackNotificationInput) {
  return {
    subject: `[WikiGuesser] New ${input.kind.toLowerCase().replaceAll("_", " ")} feedback`,
    text: [
      "A player submitted feedback in WikiGuesser.",
      "",
      `Feedback ID: ${input.id}`,
      `Type: ${input.kind}`,
      `Page: ${input.path ?? "Not available"}`,
      "",
      "Message:",
      input.message || "No written message.",
      "",
      "Gameplay context:",
      formatContext(input.context),
    ].join("\n"),
  };
}

export async function sendFeedbackNotification(input: FeedbackNotificationInput) {
  const { feedbackNotificationFrom, feedbackNotificationTo, resendApiKey } = env;

  if (!feedbackNotificationFrom || !feedbackNotificationTo || !resendApiKey) {
    return { sent: false as const, reason: "not-configured" as const };
  }

  const notification = createFeedbackNotification(input);
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: feedbackNotificationFrom,
      subject: notification.subject,
      text: notification.text,
      to: [feedbackNotificationTo],
    }),
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Resend rejected the notification (HTTP ${response.status}).`);
  }

  return { sent: true as const };
}
