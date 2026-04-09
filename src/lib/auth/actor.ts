import { randomUUID } from "node:crypto";

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

const GUEST_ACTOR_COOKIE = "wikiguesser_guest";
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const AUTHENTICATED_ACTOR_PREFIX = "user:";

export async function getActorId() {
  const { userId } = await auth();

  if (userId) {
    return `${AUTHENTICATED_ACTOR_PREFIX}${userId}`;
  }

  const cookieStore = await cookies();
  let guestId = cookieStore.get(GUEST_ACTOR_COOKIE)?.value;

  if (!guestId) {
    guestId = randomUUID();
    cookieStore.set(GUEST_ACTOR_COOKIE, guestId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: GUEST_COOKIE_MAX_AGE,
    });
  }

  return `guest:${guestId}`;
}

export function getClerkUserIdFromActorId(actorId: string): string | null {
  if (!actorId.startsWith(AUTHENTICATED_ACTOR_PREFIX)) {
    return null;
  }

  const clerkUserId = actorId.slice(AUTHENTICATED_ACTOR_PREFIX.length);
  return clerkUserId.length > 0 ? clerkUserId : null;
}

export function isGuestActorId(actorId: string): boolean {
  return actorId.startsWith("guest:");
}

export async function getOptionalActorId() {
  const { userId } = await auth();

  if (userId) {
    return `${AUTHENTICATED_ACTOR_PREFIX}${userId}`;
  }

  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_ACTOR_COOKIE)?.value;

  return guestId ? `guest:${guestId}` : null;
}

export { GUEST_ACTOR_COOKIE };
