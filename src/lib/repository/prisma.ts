import { createRequire } from "node:module";

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";

import { env } from "@/src/lib/env";

declare global {
  var prisma: PrismaClient | undefined;
}

const require = createRequire(import.meta.url);

function getWebSocketConstructor(): typeof WebSocket {
  if (typeof globalThis.WebSocket === "function") {
    return globalThis.WebSocket;
  }

  process.env.WS_NO_BUFFER_UTIL = "1";
  const wsModule = require("ws") as { default?: typeof WebSocket };
  return (wsModule.default ?? wsModule) as typeof WebSocket;
}

function hasRequiredDelegates(
  client: PrismaClient | undefined,
): client is PrismaClient {
  if (!client) {
    return false;
  }

  const candidate = client as PrismaClient & {
    dailyChallenge?: unknown;
    dailyResult?: unknown;
    userDailyCategoryModeStats?: unknown;
    duel?: unknown;
    duelRound?: unknown;
    duelAttempt?: unknown;
  };

  return Boolean(
    candidate.dailyChallenge &&
    candidate.dailyResult &&
    candidate.userDailyCategoryModeStats &&
    candidate.duel &&
    candidate.duelRound &&
    candidate.duelAttempt,
  );
}

export function getPrismaClient(): PrismaClient {
  if (!hasRequiredDelegates(globalThis.prisma)) {
    if (!env.databaseUrl) {
      throw new Error("DATABASE_URL is not configured.");
    }

    neonConfig.webSocketConstructor = getWebSocketConstructor();

    const adapter = new PrismaNeon({ connectionString: env.databaseUrl });

    globalThis.prisma = new PrismaClient({ adapter });
  }

  return globalThis.prisma;
}
