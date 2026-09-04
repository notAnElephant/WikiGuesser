import { AccountUserButton } from "@/src/components/account-user-button";
import { AdminDailyAnswersProfilePage } from "@/src/components/admin-daily-answers-profile-page";
import { AppToaster } from "@/src/components/app-toaster";
import { PostHogIdentity } from "@/src/components/posthog-identity";
import { ThemeProvider } from "@/src/components/theme-provider";
import { ThemeToggle } from "@/src/components/theme-toggle";

import { isAdminUser } from "@/src/lib/auth/admin";
import { ClerkProvider, Show } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Dice5, LogIn, Trophy, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { JetBrains_Mono, Outfit, Sarina } from "next/font/google";
import Link from "next/link";

import "./layers.css";
import "./globals.css";

const outfit = Outfit({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-outfit",
});

const jetBrainsMono = JetBrains_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const sarina = Sarina({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-sarina",
  weight: "400",
});

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
    <html
      className="dark"
      data-astryx-theme="butter"
      data-theme="dark"
      lang="en"
      suppressHydrationWarning
    >
      <body
        className={`${outfit.variable} ${jetBrainsMono.variable} ${sarina.variable} min-h-screen bg-body font-sans text-primary transition-colors`}
      >
        <ThemeProvider>
          <ClerkProvider signUpForceRedirectUrl="/profile-name">
            <PostHogIdentity />
            <header className="fixed inset-x-0 top-0 z-40 p-3 sm:p-4">
              <Card
                className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3"
                elevation="low"
                padding={2}
              >
                <Link
                  className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-muted"
                  href="/"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-md bg-muted text-accent">
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
                    className="inline-flex size-10 items-center justify-center rounded-md bg-muted text-accent transition-colors hover:bg-card"
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
                      className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-muted hover:text-primary"
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
                    <Button
                      href="/sign-up"
                      icon={<UserPlus aria-hidden="true" className="size-4" />}
                      label="Sign up"
                      size="lg"
                      variant="primary"
                    />
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
              </Card>
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
