# WikiGuesser — Butter Design System

Source of inspiration: Astryx “Butter” theme, extracted from
`https://astryx.atmeta.com/themes?theme=butter` on 2026-09-04.

This is an Astryx implementation adapted to WikiGuesser's clue, map,
daily-challenge, leaderboard, and duel flows. The implementation source of
truth is `src/themes/butter/butterTheme.ts`; its generated CSS and theme object
live beside it and must be rebuilt with `npm run astryx -- theme build
./src/themes/butter/butterTheme.ts` after theme changes.

## Product character

WikiGuesser should feel like a well-made tabletop atlas translated to a fast
web game: warm, compact, legible, and quietly playful. Gameplay is the visual
focus. Decoration should never compete with the current clue, guess field,
score, or next action.

The system intentionally avoids the familiar generated-dashboard look:

- No decorative gradients, glowing blobs, excessive glass, or nested cards.
- No arbitrary accent color per feature.
- No oversized marketing typography inside gameplay.
- No rounded rectangle around content that already has a clear grouping.
- No icon when a short text label is clearer.
- No invented illustrations, mascots, or generic brand marks.

## Foundations

### Color roles

| Role           | Light                        | Dark                             | Use |
| -------------- | ---------------------------- | -------------------------------- | --- |
| Body           | `--color-background-body`    | Page background                  |
| Surface        | `--color-background-surface` | Controls and navigation          |
| Card           | `--color-background-card`    | Grouped content                  |
| Muted surface  | `--color-background-muted`   | Quiet grouping and controls      |
| Primary text   | `--color-text-primary`       | Headings and body                |
| Secondary text | `--color-text-secondary`     | Supporting text and metadata     |
| Border         | `--color-border`             | Dividers and control outlines    |
| Accent         | `--color-accent`             | Primary actions and active state |
| Success        | `--color-success`            | Completed/valid state            |
| Error          | `--color-error`              | Errors and destructive action    |

Cobalt is rationed. It may fill buttons and small active controls, color links,
or mark focus. It must not become a page background or decorative wash.

Map semantics are independent from brand semantics. Red marks the player's
incorrect geography guess; blue marks the solution. These must remain stable
even though the solution blue is near the brand hue.

### Typography

- UI, body, and headings: Outfit through `next/font` and the Butter theme.
- Code/data notation: JetBrains Mono through `next/font`.
- Astryx display text may use Sarina for rare celebratory moments; it is not a
  general-purpose heading face.
- Use sentence case. Uppercase is reserved for short metadata labels at 12px or
  smaller with measured tracking.

Type scale: 12, 14, 16, 18, 22, 29, 40px. Gameplay headings should normally
stop at 29px; the 40px step is reserved for the landing title and final result.

### Space, shape, elevation

- Base spacing unit: 8px. Half-step: 4px.
- Default gaps: 8px inside compact controls, 16px between related elements,
  24–32px between page sections.
- Control radius: 8px. Panel radius: 12px. Card radius: 16px. Pills are for
  tags, avatars, and inherently circular status only—not every button.
- Standard surface shadow: `0 2px 4px rgba(29,28,17,.05), 0 4px 8px rgba(29,28,17,.1)`.
- Raised/floating shadow: `0 1px 1px rgba(0,0,0,.1), 0 2px 8px rgba(0,0,0,.1)`.
- Standard cards are opaque. Backdrop blur is allowed only for a genuinely
  floating overlay that must retain context behind it.

### Motion

- Fast feedback: 125ms. Standard state transition: 175ms.
- Curve: `cubic-bezier(0.24, 1, 0.4, 1)`.
- Hover lift is at most 1px. No ambient floating or looping decoration.
- Respect `prefers-reduced-motion`; never make progress or comprehension depend
  on animation.

## Component contracts

### Surface

Use Astryx `Card`. Prefer its `muted` or color variants only where meaning
requires them, and use `elevation` instead of custom shadows. Prefer dividers
and whitespace over nesting a card inside another card.

### Buttons

Use Astryx `Button` and `IconButton`; use `SelectableCard` for visual choices.

- Primary: cobalt fill, white/dark-on-brand text. One primary action per local
  decision area.
- Secondary: white surface, neutral border, warm ink. It may reveal a cobalt
  border/text on hover.
- Quiet: text/icon only for navigation and low-risk utilities.
- Destructive: danger color; never reuse primary cobalt.

Icon-only controls require an accessible label and a consistent 40px square
hit area.

### Forms

Use Astryx `TextInput`, `Selector`, and other field components. Labels stay
visible unless the component's accessible hidden-label option is intentional.
Use component status props for validation instead of separate custom chrome.

### Segmented controls and filters

Use Astryx `SegmentedControl` with `SegmentedControlItem`. It owns selection,
keyboard behavior, focus, and Butter's active treatment.

### Game-specific patterns

- Clue rows: a simple ordered stack with dividers; avoid a separate card per
  clue unless the clue is interactive.
- Category choices: one restrained colored cue per category is allowed, but
  selected/action state remains cobalt.
- Score and streak: tabular numerals; reward yellow is used for achievement,
  never for navigation.
- Leaderboards: dense rows, fixed numeric columns, minimal chrome.
- Duel status: two balanced player columns with a narrow neutral versus axis.
- Result moments may use the raised cream surface and reward color, but should
  return quickly to the ordinary component vocabulary.

## Layout

- Maximum application width: 1200px (`max-w-6xl`).
- Header is a bounded opaque surface, not glass. It should remain visually
  quieter than the active game.
- Mobile layouts collapse to one clear reading/interaction order. Do not retain
  desktop sidebars as horizontally scrolling card strips.
- Information density may increase down a page, but the primary action must be
  visible without searching.

## Accessibility

- Maintain WCAG AA contrast for text and interactive states.
- Every interactive element has a visible keyboard focus state.
- Never communicate guessed, correct, locked, or selected state through color
  alone; retain text, icon, shape, or pattern reinforcement.
- Target size is at least 40px, preferably 44px on touch-first controls.
- Dark mode is an intentional warm-ink counterpart, not a simple inversion.

## Implementation map

- Theme source: `src/themes/butter/butterTheme.ts`
- Generated SSR theme: `src/themes/butter/butter.css` and `butter.js`
- CSS layer order: `app/layers.css`
- Tailwind/Astryx imports and map-only styles: `app/globals.css`
- Astryx/next-themes synchronization: `src/components/theme-provider.tsx`
- Game metadata: `src/components/game-shell/config.ts`
- Extracted Astryx source material:
  `.superdesign/website/astryx.atmeta.com/`

New UI must use Astryx components first and the official token-backed Tailwind
bridge (`bg-body`, `bg-surface`, `bg-card`, `text-primary`, `text-secondary`,
`border-border`, `text-accent`) for layout-specific styling. Hard-coded
interface colors, radii, and shadows are not allowed. Local values remain
acceptable only for geometry-dependent visualization behavior and the
documented map-state palette.
