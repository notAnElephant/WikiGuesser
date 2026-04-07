import type { Metadata } from "next";
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import "./globals.css";

export const metadata: Metadata = {
  title: "WikiGuesser",
  description: "Guess entities from curated Wikipedia-derived clues.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.16),transparent_35%),radial-gradient(circle_at_top_right,rgba(234,179,8,0.16),transparent_28%),linear-gradient(180deg,#f9f4eb_0%,#f2eadb_100%)] font-sans text-[#1f1b17]">
        <ClerkProvider>
          <header className="fixed inset-x-0 top-0 z-40 flex justify-end p-3 sm:p-4">
            <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white/80 p-2 shadow-[0_18px_40px_rgba(53,36,22,0.12)] backdrop-blur-xl">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#1f1b17] transition hover:-translate-y-0.5">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="inline-flex items-center justify-center rounded-full bg-[#0f766e] px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5">
                    Sign up
                  </button>
                </SignUpButton>
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
