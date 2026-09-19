import { HStack } from "@astryxdesign/core/HStack";
import { MobileTools } from "@/src/components/mobile-tools";
import { AccountUserButton } from "@/src/components/account-user-button";
import { AdminDailyAnswersProfilePage } from "@/src/components/admin-daily-answers-profile-page";
import { AppToaster } from "@/src/components/app-toaster";
import { FeedbackButton } from "@/src/components/feedback-button";
import { PostHogIdentity } from "@/src/components/posthog-identity";
import { PwaInstallButton } from "@/src/components/pwa-install-button";
import { OfflinePackProvider } from "@/src/components/offline-pack-provider";
import { ThemeProvider } from "@/src/components/theme-provider";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { WikiGuesserLogo } from "@/src/components/wikiguesser-logo";
import { WikiGuesserSerwistProvider } from "@/app/serwist-provider";

import { isAdminUser } from "@/src/lib/auth/admin";
import { ClerkProvider, Show } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@astryxdesign/core/Button";
import { AppShell } from "@astryxdesign/core/AppShell";
import { IconButton } from "@astryxdesign/core/IconButton";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ChartNoAxesCombined, LogIn, Trophy, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import {
  Albert_Sans,
  Fraunces,
  JetBrains_Mono,
  Outfit,
  Sarina,
} from "next/font/google";

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

const albertSans = Albert_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-albert-sans",
});

const fraunces = Fraunces({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WikiGuesser",
  },
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
    <html data-astryx-theme="chocolate" lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${jetBrainsMono.variable} ${sarina.variable} ${albertSans.variable} ${fraunces.variable} min-h-screen bg-body font-sans text-primary transition-colors`}
      >
        <WikiGuesserSerwistProvider>
          <OfflinePackProvider>
            <ThemeProvider>
              <ClerkProvider signUpForceRedirectUrl="/profile-name">
                <PostHogIdentity />
                <AppShell
                  contentPadding={0}
                  height="auto"
                  topNav={
                  <TopNav
                    heading={
                      <TopNavHeading
                        heading="WikiGuesser"
                        headingHref="/"
                        logo={<WikiGuesserLogo className="size-9 shrink-0" />}
                      />
                    }
                    label="WikiGuesser navigation"
                    endContent={
                    <HStack gap={1} className="min-w-0 sm:gap-2">
                      <HStack className="hidden sm:flex">
                        <PwaInstallButton />
                      </HStack>
                      <IconButton
                        className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
                        href="/leaderboard"
                        icon={
                          <Trophy
                            aria-hidden="true"
                            className="size-4"
                            strokeWidth={2.2}
                          />
                        }
                        label="Leaderboard"
                        tooltip="Leaderboard"
                        variant="ghost"
                      />
                      <HStack className="hidden sm:flex" gap={2}>
                        <ThemeToggle />
                        <FeedbackButton />
                      </HStack>
                      <MobileTools />
                      <Show when="signed-out">
                        <Button
                          className="min-h-11 w-28 sm:min-h-0"
                          href="/sign-in"
                          icon={
                            <LogIn
                              aria-hidden="true"
                              className="size-4"
                              strokeWidth={2.2}
                            />
                          }
                          label="Log in"
                          variant="ghost"
                        />
                        <Button
                          className="min-h-11 w-28 sm:min-h-0"
                          href="/sign-up"
                          icon={
                            <UserPlus
                              aria-hidden="true"
                              className="size-4"
                              strokeWidth={2.2}
                            />
                          }
                          label="Sign up"
                          variant="primary"
                        />
                      </Show>
                      <Show when="signed-in">
                        <IconButton
                          className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
                          href="/stats"
                          icon={
                            <ChartNoAxesCombined
                              aria-hidden="true"
                              className="size-4"
                              strokeWidth={2.2}
                            />
                          }
                          label="My stats"
                          tooltip="My stats"
                          variant="ghost"
                        />
                        <AccountUserButton
                          adminDailyAnswersPage={
                            isAdmin ? (
                              <AdminDailyAnswersProfilePage />
                            ) : undefined
                          }
                          isAdmin={isAdmin}
                        />
                      </Show>
                    </HStack>
                    }
                  />
                  }
                  variant="surface"
                >
                  {children}
                </AppShell>
                <AppToaster />
              </ClerkProvider>
            </ThemeProvider>
          </OfflinePackProvider>
        </WikiGuesserSerwistProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
