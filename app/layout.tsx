import { HStack } from "@astryxdesign/core/HStack";
import { HeaderAuthControls } from "@/src/components/header-auth-controls";
import { AdminDailyAnswersProfilePage } from "@/src/components/admin-daily-answers-profile-page";
import { AppBrand } from "@/src/components/app-brand";
import { AppToaster } from "@/src/components/app-toaster";
import { FeedbackButton } from "@/src/components/feedback-button";
import { PostHogIdentity } from "@/src/components/posthog-identity";
import { PwaInstallButton } from "@/src/components/pwa-install-button";
import { OfflinePackProvider } from "@/src/components/offline-pack-provider";
import { ThemeProvider } from "@/src/components/theme-provider";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { WikiGuesserSerwistProvider } from "@/app/serwist-provider";

import { isAdminUser } from "@/src/lib/auth/admin";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { AppShell } from "@astryxdesign/core/AppShell";
import { IconButton } from "@astryxdesign/core/IconButton";
import { TopNav } from "@astryxdesign/core/TopNav";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Trophy } from "lucide-react";
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
              <ClerkProvider dynamic signUpForceRedirectUrl="/profile-name">
                <PostHogIdentity />
                <AppShell
                  contentPadding={0}
                  height="auto"
                  topNav={
                  <TopNav
                    heading={<AppBrand />}
                    label="WikiGuesser navigation"
                    endContent={
                    <HStack align="center" gap={1} className="min-w-0 sm:gap-2">
                      <HStack className="hidden sm:flex" gap={1}>
                        <PwaInstallButton />
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
                        <ThemeToggle />
                        <FeedbackButton />
                      </HStack>
                      <HeaderAuthControls
                        adminDailyAnswersPage={
                          isAdmin ? <AdminDailyAnswersProfilePage /> : undefined
                        }
                        isAdmin={isAdmin}
                      />
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
