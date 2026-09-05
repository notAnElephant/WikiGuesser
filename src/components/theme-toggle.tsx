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

export function ThemeToggle() {
  const { colorMode, setColorMode, themeName, setThemeName } = useAstryxTheme();

  return (
    <Popover
      alignment="end"
      content={
        <fieldset className="flex w-64 flex-col gap-4">
          <legend className="sr-only">Style settings</legend>
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
      }
      label="Choose style"
      placement="below"
    >
      <IconButton
        icon={<Palette aria-hidden="true" className="size-4" strokeWidth={2} />}
        label="Choose style"
        variant="ghost"
      />
    </Popover>
  );
}
