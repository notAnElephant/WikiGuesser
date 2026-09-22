"use client";

import type { ReactNode } from "react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Popover } from "@astryxdesign/core/Popover";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { Monitor, Moon, Palette, Sun } from "lucide-react";

import {
  astryxThemeOptions,
  colorModeOptions,
  type ColorMode,
  type AstryxThemeName,
  useAstryxTheme,
} from "@/src/components/theme-provider";

const colorModeIcons = {
  light: <Sun aria-hidden="true" className="size-4" strokeWidth={2} />,
  dark: <Moon aria-hidden="true" className="size-4" strokeWidth={2} />,
  system: <Monitor aria-hidden="true" className="size-4" strokeWidth={2} />,
} satisfies Record<ColorMode, ReactNode>;

export function ThemeSettings({ showStyle = false }: { showStyle?: boolean }) {
  const { colorMode, setColorMode, themeName, setThemeName } = useAstryxTheme();
  return (
    <fieldset className="flex min-w-0 flex-col gap-4">
      <legend className="sr-only">Style settings</legend>
      {showStyle ? (
        <Selector
          label="Style"
          onChange={(nextTheme) => setThemeName(nextTheme as AstryxThemeName)}
          options={astryxThemeOptions.map(({ id, label }) => ({
            label,
            value: id,
          }))}
          value={themeName}
          width="100%"
        />
      ) : null}
      <SegmentedControl
        label="Color mode"
        layout="fill"
        onChange={(nextMode) => setColorMode(nextMode as ColorMode)}
        size="sm"
        value={colorMode}
      >
        {colorModeOptions.map(({ id, label }) => (
          <SegmentedControlItem
            icon={colorModeIcons[id]}
            key={id}
            label={label}
            value={id}
          />
        ))}
      </SegmentedControl>
    </fieldset>
  );
}

export function ThemeToggle({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <Popover
      alignment="end"
      content={<ThemeSettings showStyle={isAdmin} />}
      width="18rem"
      label="Appearance settings"
      placement="below"
    >
      <IconButton
        className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
        icon={<Palette aria-hidden="true" className="size-4" strokeWidth={2} />}
        label="Appearance settings"
        variant="ghost"
      />
    </Popover>
  );
}
