import Link from "next/link";
import type { Metadata } from "next";
import { ClerkProvider, Show, UserButton } from "@clerk/nextjs";

import "./globals.css";

export const metadata: Metadata = {
  title: "WikiGuesser",
  description: "A fast clue-based trivia game built from Wikipedia-inspired topics.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.16),transparent_35%),radial-gradient(circle_at_top_right,rgba(234,179,8,0.16),transparent_28%),linear-gradient(180deg,#f9f4eb_0%,#f2eadb_100%)] font-sans text-[#1f1b17]">
        <ClerkProvider>
          <header className="fixed inset-x-0 top-0 z-40 flex justify-end p-3 sm:p-4">
            <div className="flex items-center gap-2 rounded-[22px] border border-black/8 bg-white/72 px-3 py-2 shadow-[0_18px_40px_rgba(53,36,22,0.1)] backdrop-blur-xl">
              <Show when="signed-out">
                <span className="hidden text-xs uppercase tracking-[0.18em] text-[#6b6259] sm:inline">
                  Account optional
                </span>
                <Link
                  className="inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-medium text-[#6b6259] transition hover:bg-white/70 hover:text-[#1f1b17]"
                  href="/sign-in"
                >
                  Sign in
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-[rgba(15,118,110,0.18)] bg-[rgba(15,118,110,0.06)] px-3 py-2 text-sm font-medium text-[#115e59] transition hover:bg-[rgba(15,118,110,0.12)]"
                  href="/sign-up"
                >
                  Create account
                </Link>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
