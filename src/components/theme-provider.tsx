"use client";

import type { ReactNode } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

import { butterTheme } from "@/src/themes/butter/butter";

interface ThemeProviderProps {
  children: ReactNode;
}

function AstryxThemeBridge({ children }: ThemeProviderProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Theme
      mode={resolvedTheme === "light" ? "light" : "dark"}
      theme={butterTheme}
    >
      {children}
    </Theme>
  );
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
    >
      <AstryxThemeBridge>{children}</AstryxThemeBridge>
    </NextThemesProvider>
  );
}
