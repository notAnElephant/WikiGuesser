"use client";

import { IconButton } from "@astryxdesign/core/IconButton";
import { Popover } from "@astryxdesign/core/Popover";
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
    <Popover
      alignment="end"
      content={
        <fieldset className="grid w-52 gap-3">
          <legend className="sr-only">Appearance settings</legend>
          <label className="grid gap-1.5 text-xs font-semibold text-secondary">
            Theme
            <select
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm font-medium text-primary"
              onChange={(event) => setTheme(event.target.value)}
              value={mounted ? resolvedTheme : "dark"}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-secondary">
            Color palette
            <select
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm font-medium text-primary"
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
      }
      label="Appearance settings"
      placement="below"
    >
      <IconButton
        icon={<Palette aria-hidden="true" className="size-4" strokeWidth={2} />}
        label="Appearance settings"
        variant="ghost"
      />
    </Popover>
  );
}
