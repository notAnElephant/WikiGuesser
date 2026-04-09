import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { claimPendingDailyResults } from "@/src/lib/repository/daily-repository";
import {
  PENDING_DAILY_CLAIMS_COOKIE,
  getPendingDailyClaimCookieOptions,
  parsePendingDailyClaimIds,
} from "@/src/lib/game/daily-claim-cookie";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const cookieStore = await cookies();
  const pendingIds = parsePendingDailyClaimIds(
    cookieStore.get(PENDING_DAILY_CLAIMS_COOKIE)?.value,
  );

  if (pendingIds.length === 0) {
    return NextResponse.json({ claimedCount: 0, message: null });
  }

  const claimedCount = await claimPendingDailyResults(userId, pendingIds);
  const response = NextResponse.json({
    claimedCount,
    message:
      claimedCount > 0
        ? claimedCount === 1
          ? "Daily score claimed."
          : `${claimedCount} daily scores claimed.`
        : null,
  });

  response.cookies.set(PENDING_DAILY_CLAIMS_COOKIE, "", {
    ...getPendingDailyClaimCookieOptions(),
    maxAge: 0,
  });

  return response;
}
