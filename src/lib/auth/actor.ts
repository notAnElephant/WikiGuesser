import { randomUUID } from "node:crypto";

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

const GUEST_ACTOR_COOKIE = "wikiguesser_guest";
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function getActorId() {
  const { userId } = await auth();

  if (userId) {
    return `user:${userId}`;
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
