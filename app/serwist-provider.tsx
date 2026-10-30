"use client";

import { SerwistProvider } from "@serwist/next/react";
import type { ReactNode } from "react";

export function WikiGuesserSerwistProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SerwistProvider
      cacheOnNavigation={false}
      disable={process.env.NODE_ENV === "development"}
      reloadOnOnline={false}
      swUrl="/sw.js"
    >
      {children}
    </SerwistProvider>
  );
}
