import { AccountUserButton } from "@/src/components/account-user-button";
import { AdminDailyAnswersProfilePage } from "@/src/components/admin-daily-answers-profile-page";
import { AppToaster } from "@/src/components/app-toaster";
import { PostHogIdentity } from "@/src/components/posthog-identity";
import { ThemeProvider } from "@/src/components/theme-provider";
import { ThemeToggle } from "@/src/components/theme-toggle";

import { isAdminUser } from "@/src/lib/auth/admin";
import { ClerkProvider, Show } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Dice5, LogIn, Trophy, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "WikiGuesser",
  description:
    "A fast clue-based trivia game built from Wikipedia-inspired topics.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { userId } = await auth();
  const isAdmin = isAdminUser(userId);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--app-background)] font-sans text-[var(--app-foreground)] transition-colors">
        <ThemeProvider>
          <ClerkProvider signUpForceRedirectUrl="/profile-name">
            <PostHogIdentity />
            <header className="fixed inset-x-0 top-0 z-40 p-3 sm:p-4">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-3xl border border-black/8 bg-white/72 px-3 py-2 shadow-[0_18px_40px_rgba(53,36,22,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(9,16,26,0.76)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.34)]">
                <Link
                  className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold text-[#1f1b17] transition hover:bg-white/70 dark:text-[#f5f7fb] dark:hover:bg-white/10"
                  href="/"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(15,118,110,0.14),rgba(255,219,112,0.16))] text-[#115e59] dark:bg-[linear-gradient(135deg,rgba(36,212,194,0.16),rgba(56,189,248,0.14))] dark:text-[#8ff4e7]">
                    <Dice5
                      aria-hidden="true"
                      className="size-4.5"
                      strokeWidth={2.2}
                    />
                  </span>
                  <span>WikiGuesser</span>
                </Link>

                <div className="flex items-center gap-2">
                  <Link
                    aria-label="Leaderboard"
                    className="inline-flex size-10 items-center justify-center rounded-full bg-[rgba(15,118,110,0.08)] text-[#115e59] transition hover:bg-[rgba(15,118,110,0.15)] dark:bg-[rgba(45,212,191,0.12)] dark:text-[#8ff4e7] dark:hover:bg-[rgba(45,212,191,0.2)]"
                    href="/leaderboard"
                    title="Leaderboard"
                  >
                    <Trophy
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={2.2}
                    />
                  </Link>
                  <ThemeToggle />
                  <Show when="signed-out">
                    <Link
                      aria-label="Log in"
                      className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-[#6b6259] transition hover:bg-white/70 hover:text-[#1f1b17] dark:text-[#d7e1ec] dark:hover:bg-white/10 dark:hover:text-white"
                      href="/sign-in"
                      title="Log in"
                    >
                      <LogIn
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={2.2}
                      />
                      Log in
                    </Link>
                    <Link
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(15,118,110,0.18)] bg-[rgba(15,118,110,0.06)] px-3 py-2 text-sm font-medium text-[#115e59] transition hover:bg-[rgba(15,118,110,0.12)] dark:border-[rgba(45,212,191,0.24)] dark:bg-[rgba(45,212,191,0.12)] dark:text-[#8ff4e7] dark:hover:bg-[rgba(45,212,191,0.18)]"
                      href="/sign-up"
                    >
                      <UserPlus
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={2.2}
                      />
                      Sign up
                    </Link>
                  </Show>
                  <Show when="signed-in">
                    <AccountUserButton
                      adminDailyAnswersPage={
                        isAdmin ? <AdminDailyAnswersProfilePage /> : undefined
                      }
                      isAdmin={isAdmin}
                    />
                  </Show>
                </div>
              </div>
            </header>
            {children}
            <AppToaster />
          </ClerkProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
