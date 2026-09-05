# WikiGuesser design system

Astryx supplies the components and semantic tokens. Chocolate is the default style;
its Fraunces headings, Albert Sans body font, rounded controls, and spacing remain
consistent across light and dark modes. Existing saved style choices are preserved.

## Chocolate colors

| Role | Light | Dark |
| --- | --- | --- |
| Page | `#f7f2ee` | `#111111` |
| Card / popover | `#fffaf7` | `#241f1c` |
| Main text | `#111111` | `#d4c5c7` |
| Secondary text | `#6b5b51` | `#b9a394` |
| Primary action fill | `#25d4c2` | `#25d4c2` |
| Text on primary action | `#111111` | `#111111` |
| Accent text / focus | `#006e64` | `#25d4c2` |
| Lavender highlight fill | `#dad4ef` | `#30293f` |
| Lavender highlight text | `#625085` | `#dad4ef` |
| Success | `#276749` | `#8acda3` |
| Error | `#b13f4b` | `#ee939c` |
| Warning | `#805300` | `#e8bd67` |

Status fills use white labels in light mode and Onyx labels in dark mode. Muted
status surfaces have separate tokens. Keep labels/icons alongside color to explain
status. Turquoise is too light for text on pale backgrounds, so accent text and
focus outlines use deep teal in light mode. Do not use white labels on turquoise.

## Mode and implementation

The palette button in the header opens Style and Color mode settings. Light, Dark,
and System are persisted separately from style. System follows the OS preference.
`next-themes` handles the early color-mode script and root attributes; Astryx receives
the resolved mode. Toasts follow the selected mode. Map guesses use error roles;
map solutions use purple roles so they stay visually distinct.

Edit `src/themes/chocolate/chocolateTheme.ts`, using `[light, dark]` tuples. Use
semantic component props or token-backed utilities in UI code, rather than copying
hex values into components. The theme references the font variables loaded by
`next/font` in the root layout.

After editing the theme, rebuild its generated CSS, JS and declarations:

```sh
pnpm exec astryx theme build src/themes/chocolate/chocolateTheme.ts
pnpm typecheck
```

Check text on every body, card, surface and muted background in both modes, including
status labels, focus indicators, hover states, map markers, and portal content.
The initial palette check covered 76 text/background combinations; all exceeded
4.5:1 (minimum 4.59:1). That does not replace checking the rendered UI after changes.
