"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { useTheme } from "next-themes";

const PALETTE_STORAGE_KEY = "wikiguesser-palette";

const palettes = [
  { id: "atlas", label: "Atlas" },
  { id: "sunset", label: "Sunset" },
  { id: "violet", label: "Violet" },
] as const;

type PaletteId = (typeof palettes)[number]["id"];

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [palette, setPalette] = useState<PaletteId>("atlas");

  useEffect(() => {
    const savedPalette = window.localStorage.getItem(PALETTE_STORAGE_KEY);
    const nextPalette = palettes.some(({ id }) => id === savedPalette)
      ? (savedPalette as PaletteId)
      : "atlas";

    document.documentElement.dataset.palette = nextPalette;
    setPalette(nextPalette);
    setMounted(true);
  }, []);

  function updatePalette(nextPalette: PaletteId) {
    document.documentElement.dataset.palette = nextPalette;
    window.localStorage.setItem(PALETTE_STORAGE_KEY, nextPalette);
    setPalette(nextPalette);
  }

  return (
    <details className="relative">
      <summary
        aria-label="Open appearance settings"
        className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-black/10 bg-white/70 text-[#43525e] transition hover:bg-white dark:border-white/10 dark:bg-white/8 dark:text-[#d9e4ef] dark:hover:bg-white/12 [&::-webkit-details-marker]:hidden"
        title="Appearance settings"
      >
        <Palette aria-hidden="true" className="size-4.5" strokeWidth={2} />
      </summary>
      <fieldset className="absolute right-0 top-12 z-50 grid w-52 gap-3 rounded-2xl border border-black/10 bg-white p-3 shadow-[0_18px_40px_rgba(53,36,22,0.16)] dark:border-white/10 dark:bg-[#101b28] dark:shadow-[0_18px_40px_rgba(0,0,0,0.38)]">
        <legend className="sr-only">Appearance settings</legend>
        <label className="grid gap-1.5 text-xs font-semibold text-[#6b6259] dark:text-[#b4c0cd]">
          Theme
          <select
            className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm font-medium text-[#1f1b17] dark:border-white/10 dark:bg-white/8 dark:text-[#f5f7fb]"
            onChange={(event) => setTheme(event.target.value)}
            value={mounted ? resolvedTheme : "dark"}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#6b6259] dark:text-[#b4c0cd]">
          Color palette
          <select
            className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm font-medium text-[#1f1b17] dark:border-white/10 dark:bg-white/8 dark:text-[#f5f7fb]"
            onChange={(event) => updatePalette(event.target.value as PaletteId)}
            value={palette}
          >
            {palettes.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
    </details>
  );
}
