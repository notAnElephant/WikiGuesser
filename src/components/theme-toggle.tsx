"use client";

import { IconButton } from "@astryxdesign/core/IconButton";
import { Popover } from "@astryxdesign/core/Popover";
import { Selector } from "@astryxdesign/core/Selector";
import { Palette } from "lucide-react";

import {
  astryxThemeOptions,
  type AstryxThemeName,
  useAstryxTheme,
} from "@/src/components/theme-provider";

export function ThemeToggle() {
  const { themeName, setThemeName } = useAstryxTheme();

  return (
    <Popover
      alignment="end"
      content={
        <fieldset className="w-52">
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
