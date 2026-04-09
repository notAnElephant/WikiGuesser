import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { env } from "@/src/lib/env";
import type { RoundState } from "@/src/lib/types";

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", env.roundTokenSecret)
    .update(payload)
    .digest("base64url");
}

export function createRoundState(
  data: Omit<RoundState, "roundId">,
): RoundState {
  return {
    ...data,
    roundId: randomUUID(),
  };
}

export function serializeRoundState(state: RoundState): string {
  const payload = encodeBase64Url(JSON.stringify(state));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function parseRoundState(token: string): RoundState {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    throw new Error("Invalid round token.");
  }

  const expectedSignature = sign(payload);

  if (signature.length !== expectedSignature.length) {
    throw new Error("Round token signature mismatch.");
  }

  if (
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    throw new Error("Round token signature mismatch.");
  }

  return JSON.parse(decodeBase64Url(payload)) as RoundState;
}
