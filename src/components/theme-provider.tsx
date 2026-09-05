"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Theme, type DefinedTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import {
  ThemeProvider as ColorModeProvider,
  useTheme as useColorMode,
} from "next-themes";

import { butterTheme } from "@/src/themes/butter/butter";
import { chocolateTheme } from "@/src/themes/chocolate/chocolate";
import { gothicTheme } from "@/src/themes/gothic/gothic";
import { matchaTheme } from "@/src/themes/matcha/matcha";
import { stoneTheme } from "@/src/themes/stone/stone";
import { y2kTheme } from "@/src/themes/y2k/y2k";

const ASTRYX_THEME_STORAGE_KEY = "wikiguesser-astryx-theme";
const COLOR_MODE_STORAGE_KEY = "wikiguesser-color-mode";

export const astryxThemeOptions = [
  { id: "butter", label: "Butter" },
  { id: "chocolate", label: "Chocolate" },
  { id: "gothic", label: "Gothic" },
  { id: "matcha", label: "Matcha" },
  { id: "neutral", label: "Neutral" },
  { id: "stone", label: "Stone" },
  { id: "y2k", label: "Y2K" },
] as const;

export type AstryxThemeName = (typeof astryxThemeOptions)[number]["id"];

export const colorModeOptions = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
] as const;

export type ColorMode = (typeof colorModeOptions)[number]["id"];

const astryxThemes: Record<AstryxThemeName, DefinedTheme> = {
  butter: butterTheme,
  chocolate: chocolateTheme,
  gothic: gothicTheme,
  matcha: matchaTheme,
  neutral: neutralTheme,
  stone: stoneTheme,
  y2k: y2kTheme,
};

interface AstryxThemeContextValue {
  colorMode: ColorMode;
  resolvedColorMode: "light" | "dark";
  setColorMode: (colorMode: ColorMode) => void;
  themeName: AstryxThemeName;
  setThemeName: (themeName: AstryxThemeName) => void;
}

const AstryxThemeContext = createContext<AstryxThemeContextValue | null>(null);

export function useAstryxTheme() {
  const context = useContext(AstryxThemeContext);

  if (context === null) {
    throw new Error("useAstryxTheme must be used within ThemeProvider.");
  }

  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ColorModeProvider
      attribute={["class", "data-theme"]}
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      storageKey={COLOR_MODE_STORAGE_KEY}
    >
      <AstryxThemeProvider>{children}</AstryxThemeProvider>
    </ColorModeProvider>
  );
}

function AstryxThemeProvider({ children }: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<AstryxThemeName>("chocolate");
  const { resolvedTheme, setTheme, theme } = useColorMode();
  const [mounted, setMounted] = useState(false);
  const colorMode = mounted && isColorMode(theme) ? theme : "system";
  const resolvedColorMode: "light" | "dark" =
    resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => {
    setMounted(true);
    const savedTheme = window.localStorage.getItem(ASTRYX_THEME_STORAGE_KEY);

    if (astryxThemeOptions.some(({ id }) => id === savedTheme)) {
      setThemeName(savedTheme as AstryxThemeName);
    }
  }, []);

  const selectTheme = useCallback((nextTheme: AstryxThemeName) => {
    window.localStorage.setItem(ASTRYX_THEME_STORAGE_KEY, nextTheme);
    setThemeName(nextTheme);
  }, []);

  const selectColorMode = useCallback(
    (nextMode: ColorMode) => setTheme(nextMode),
    [setTheme],
  );

  const contextValue = useMemo(
    () => ({
      colorMode,
      resolvedColorMode,
      setColorMode: selectColorMode,
      themeName,
      setThemeName: selectTheme,
    }),
    [colorMode, resolvedColorMode, selectColorMode, selectTheme, themeName],
  );

  return (
    <AstryxThemeContext value={contextValue}>
      <Theme
        mode={mounted && resolvedTheme ? resolvedColorMode : "system"}
        theme={astryxThemes[themeName]}
      >
        {children}
      </Theme>
    </AstryxThemeContext>
  );
}

function isColorMode(value: string | undefined): value is ColorMode {
  return colorModeOptions.some(({ id }) => id === value);
}
