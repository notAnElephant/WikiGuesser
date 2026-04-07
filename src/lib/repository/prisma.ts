import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { env } from "@/src/lib/env";

declare global {
  var prisma: PrismaClient | undefined;
}

export function getPrismaClient(): PrismaClient {
  if (!globalThis.prisma) {
    if (!env.databaseUrl) {
      throw new Error("DATABASE_URL is not configured.");
    }

    neonConfig.webSocketConstructor = ws;

    const adapter = new PrismaNeon({ connectionString: env.databaseUrl });

    globalThis.prisma = new PrismaClient({ adapter });
  }

  return globalThis.prisma;
}
