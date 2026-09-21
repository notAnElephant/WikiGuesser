const defaultRoundSecret = "wikiguesser-local-development-secret";

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  feedbackNotificationFrom: process.env.FEEDBACK_NOTIFICATION_FROM,
  feedbackNotificationTo: process.env.FEEDBACK_NOTIFICATION_TO,
  resendApiKey: process.env.RESEND_API_KEY,
  roundTokenSecret: process.env.ROUND_TOKEN_SECRET ?? defaultRoundSecret,
};
