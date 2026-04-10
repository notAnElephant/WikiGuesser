import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const canonicalProductionHost = "www.wikiguesser.me";
const redirectableProductionHosts = new Set([
  "wikiguesser.me",
  "wiki-guesser-notanelephants-projects.vercel.app",
  "wiki-guesser-git-main-notanelephants-projects.vercel.app",
]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/rounds/start",
  "/api/rounds/(.*)/guess",
  "/api/rounds/(.*)/reveal",
  "/api/daily/start",
]);

export default clerkMiddleware(async (auth, req) => {
  const host = req.nextUrl.host;

  if (
    process.env.NODE_ENV === "production" &&
    host !== canonicalProductionHost &&
    (redirectableProductionHosts.has(host) || host.endsWith(".vercel.app"))
  ) {
    const redirectUrl = new URL(req.url);
    redirectUrl.host = canonicalProductionHost;
    redirectUrl.protocol = "https:";

    return NextResponse.redirect(redirectUrl, 308);
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
