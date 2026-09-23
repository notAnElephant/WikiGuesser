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

import { captureAnalyticsEvent } from "@/src/lib/analytics";

import { chocolateTheme } from "@/src/themes/chocolate/chocolateTheme";
import { matchaTheme } from "@/src/themes/matcha/matcha";

const THEME_EXPERIMENT_STORAGE_KEY = "wikiguesser-theme-experiment";
const COLOR_MODE_STORAGE_KEY = "wikiguesser-color-mode";

export const astryxThemeOptions = [
  { id: "chocolate", label: "Chocolate" },
  { id: "matcha", label: "Matcha" },
] as const;

export type AstryxThemeName = (typeof astryxThemeOptions)[number]["id"];

export const colorModeOptions = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
] as const;

export type ColorMode = (typeof colorModeOptions)[number]["id"];

const astryxThemes: Record<AstryxThemeName, DefinedTheme> = {
  chocolate: chocolateTheme,
  matcha: matchaTheme,
};

interface AstryxThemeContextValue {
  colorMode: ColorMode;
  resolvedColorMode: "light" | "dark";
  setColorMode: (colorMode: ColorMode) => void;
  themeName: AstryxThemeName;
  setThemeName: (themeName: AstryxThemeName) => void;
}

const AstryxThemeContext = createContext<AstryxThemeContextValue | null>(null);

export function useOptionalAstryxTheme() {
  return useContext(AstryxThemeContext);
}

export function useAstryxTheme() {
  const context = useOptionalAstryxTheme();

  if (context === null) {
    throw new Error("useAstryxTheme must be used within ThemeProvider.");
  }

  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<AstryxThemeName>("chocolate");
  const [colorMode, setColorMode] = useState<ColorMode>("system");
  const [resolvedColorMode, setResolvedColorMode] = useState<"light" | "dark">(
    "light",
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const assignedTheme = window.localStorage.getItem(
      THEME_EXPERIMENT_STORAGE_KEY,
    );
    const savedColorMode =
      window.localStorage.getItem(COLOR_MODE_STORAGE_KEY) ?? undefined;

    if (astryxThemeOptions.some(({ id }) => id === assignedTheme)) {
      setThemeName(assignedTheme as AstryxThemeName);
    } else {
      const nextTheme: AstryxThemeName =
        Math.random() < 0.5 ? "chocolate" : "matcha";
      window.localStorage.setItem(THEME_EXPERIMENT_STORAGE_KEY, nextTheme);
      setThemeName(nextTheme);
      captureAnalyticsEvent("theme_experiment_assigned", { theme: nextTheme });
    }

    if (isColorMode(savedColorMode)) {
      setColorMode(savedColorMode);
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateResolvedColorMode = () => {
      setResolvedColorMode(
        colorMode === "dark" || (colorMode === "system" && mediaQuery.matches)
          ? "dark"
          : "light",
      );
    };

    updateResolvedColorMode();
    mediaQuery.addEventListener("change", updateResolvedColorMode);

    return () => mediaQuery.removeEventListener("change", updateResolvedColorMode);
  }, [colorMode]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedColorMode);
    root.dataset.theme = resolvedColorMode;
    root.style.colorScheme = resolvedColorMode;
  }, [mounted, resolvedColorMode]);

  const selectTheme = useCallback((nextTheme: AstryxThemeName) => {
    window.localStorage.setItem(THEME_EXPERIMENT_STORAGE_KEY, nextTheme);
    setThemeName(nextTheme);
  }, []);

  const selectColorMode = useCallback(
    (nextMode: ColorMode) => {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, nextMode);
      setColorMode(nextMode);
    },
    [],
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
        mode={mounted ? resolvedColorMode : "system"}
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
