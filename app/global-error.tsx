"use client";

import { ErrorRecovery } from "@/src/components/error-recovery";

import "./layers.css";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html data-astryx-theme="chocolate" lang="en">
      <body className="min-h-screen bg-body font-sans text-primary">
        <title>WikiGuesser</title>
        <ErrorRecovery boundary="global" error={error} retry={retry} />
      </body>
    </html>
  );
}
