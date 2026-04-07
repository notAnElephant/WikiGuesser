const defaultRoundSecret = "wikiguesser-local-development-secret";

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  roundTokenSecret: process.env.ROUND_TOKEN_SECRET ?? defaultRoundSecret,
};
