const PENDING_DAILY_CLAIMS_COOKIE = "wikiguesser_daily_claims";
const MAX_PENDING_CLAIMS = 12;
const CLAIM_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function parsePendingDailyClaimIds(
  rawValue: string | undefined,
): string[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export function serializePendingDailyClaimIds(ids: string[]) {
  return JSON.stringify(ids.slice(-MAX_PENDING_CLAIMS));
}

export function getPendingDailyClaimCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CLAIM_COOKIE_MAX_AGE,
  };
}

export { PENDING_DAILY_CLAIMS_COOKIE };
