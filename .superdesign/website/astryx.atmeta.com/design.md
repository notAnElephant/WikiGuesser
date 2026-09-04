---
version: "superdesign-alpha"
name: "Butter cream commerce"
description: "A cream-and-white light system staged inside a neutral docs shell, carrying a saturated butter-yellow product frame with a script display accent, cobalt utility fills, and dense soft-bordered admin panels."
colors:
  background: "#FFFFFF"
  surface-cream: "#FDFBE4"
  surface-body: "#F8F4ED"
  text-primary: "#1D1C11"
  text-primary-alt: "#15110C"
  text-secondary: "#605F52"
  accent-cobalt: "#225BFF"
  accent-ink: "#15110C"
  accent-muted: "#1A0D0D"
  on-accent: "#FFFFFF"
  overlay: "#001128"
  border: "#E5E3D4"
  border-accent: "#225BFF"
  badge-fresh: "#FDFBE4"
  badge-popular: "#FFDCB6"
  badge-new: "#C1EFB8"
typography:
  display-lg:
    fontFamily: "Figtree"
    fontSize: "29px"
    fontWeight: 600
    lineHeight: "1.24"
  headline-md:
    fontFamily: "Outfit"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "1.45"
  label-md:
    fontFamily: "Outfit"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "1.56"
  body-md:
    fontFamily: "Times New Roman"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.5"
  accent-script:
    fontFamily: "Sarina"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: "1.2"
  label-alt:
    fontFamily: "Fustat"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "1.4"
spacing:
  base: "8px"
  gap: "16px"
  section-padding: "16px"
rounded:
  control: "8px"
  card: "16px"
  pill: "9999px"
  panel: "12px"
  chip: "6px"
components:
  button-hero-primary:
    background: "#225BFF"
    text-color: "#FFFFFF"
    radius: "8px"
    height: "40px"
    padding: "12px 16px"
  button-nav-cta:
    background: "#15110C"
    text-color: "#FFFFFF"
    radius: "9999px"
    height: "32px"
    padding: "8px 12px"
  button-secondary-glass:
    background: "rgba(5, 54, 89, 0.1)"
    text-color: "#15110C"
    radius: "9999px"
    height: "36px"
    padding: "8px 12px"
  button-footer-cta:
    background: "#225BFF"
    text-color: "#FFFFFF"
    radius: "16px"
    height: "40px"
    padding: "12px 16px"
  card-product:
    background: "transparent"
    radius: "0px"
    padding: "0px"
    shadow: "none"
  card-panel:
    background: "#FDFBE4"
    radius: "16px"
    padding: "24px"
    shadow: "rgba(29, 28, 17, 0.05) 0px 2px 4px 0px, rgba(29, 28, 17, 0.1) 0px 4px 8px 0px"
  card-ai-chat:
    background: "#FFFFFF"
    radius: "16px"
    padding: "16px"
    shadow: "rgba(0, 0, 0, 0.1) 0px 1px 1px 0px, rgba(0, 0, 0, 0.1) 0px 2px 8px 0px"
    backdrop-filter: "blur(12px)"
---
# Butter cream commerce
Source: https://astryx.atmeta.com/themes?theme=butter

## Overview
This is a light-mode-default editorial-commerce hybrid: a neutral white documentation shell hosts a fully-staged cream-and-butter-yellow product demo, itself a warm minimalist storefront with one saturated cobalt utility accent and a hand-lettered script headline treatment. The system reads as a "theme sample" — a self-contained product surface with its own token vocabulary (`--color-accent`, `--color-background-body`) nested inside a plain white host chrome. The identity is soft, tactile, and grocer-friendly rather than techy: rounded cards, pastel status chips, generous cream fields, and a single loud blue for anything actionable.

## Composition
The outer page is a stark white host: a thin edge-to-edge navbar, then immediately the full staged theme fills the remaining width as a contained rectangle with its own cream background — this is the one deliberate compositional choice, nesting a warm bounded "product" against a cold unbounded "host," rather than letting the theme bleed full-bleed as the whole page. Inside the stage: a bounded storefront navbar on `#FDFBE4`, a centered script-accented hero, a 3-up product row, then a stacked checkout+AI-chat pairing, then a dense two-column admin band (inventory table + revenue sidebar), closing on a plain dark-on-white multi-column footer. Density rises steadily downward — airy hero, medium-density cards, then a tight data table and stat list — rewarding scroll with increasing operational detail rather than more marketing copy.

## Colors
White (`#FFFFFF`) dominates the pixel field at ~75%+86.8% declared area, carrying the host chrome and card backgrounds. The staged theme's body runs on `#FDFBE4` (~12.3% declared area), a warm cream that reads as the product's true background plane, with `#F8F4ED` as its token-declared body color — these are close enough to register as one warm surface. Ink text sits in `#1D1C11`/`#15110C`, near-black but warmer than pure black, with `#605F52` for secondary/meta text. Cobalt `#225BFF` is the entire rationed accent — it appears only on primary buttons, active nav labels, and border-highlighted inputs, never as a fill of anything large. Status chips borrow pastel neutrals from the pixel field (a pale yellow "Fresh," a peach "Popular," a mint "New," a light-orange "Limited/Staple") — these are approximate, unmeasured hues consistent with `#FFF0F0`/`#FFDCB6`/`#C1EFB8` swatches. `#053659`/overlay `#001128` back the small translucent utility button fill. Large surfaces (illustration backdrops, product photo tiles) use a pale sky blue, left otherwise uncolored — no gradient, no saturation escalation.

## Typography
Figtree carries the display-scale headline of the host chrome at 29px/600/1.24 — compact for a "display" role, functioning more as a strong section title than a hero headline. Outfit is the UI workhorse: 22px/600 for mid-headlines, 18px/700 for labels/eyebrow-weight text, giving the interface a geometric, rounded-grotesk voice. The signature accent is Sarina, an italic-flavored script face used for exactly the two-line hero headline in the staged theme — oversized relative to all neighboring type, cobalt-colored, and appearing nowhere else on the page: a single, unrepeated flourish. Body copy defaults to Times New Roman at 16px/400 in near-black, an unexpected serif-for-body choice that lends the commerce copy an editorial, almost printed-catalog tone against the otherwise geometric-sans UI. Montserrat, Fustat, and Manufacturing Consent round out the family list as secondary label/meta faces in smaller UI text.

## Layout
Content is capped at a 1200px max-width. The hero product row is a uniform 3-column card grid (rows: [100 | 100 | 100] read as three equal-width tiles in one row), each card a flush image-on-blue tile with no card chrome of its own (radius 0px, transparent, zero padding) — the rounding lives in the photo tile itself, not a wrapper. The admin section below runs a fixed two-column split: a wide inventory table (checkbox, item, quantity, location, tag columns) beside a narrow revenue sidebar stacking a large numeral stat, a percentage-delta stat, and a 4-row activity list. A distinct 5-column/2-item asymmetric grid (rows [75 | 24]) appears in the checkout+AI-chat pairing, giving the chat/AI panel roughly a quarter of the row and the checkout form the remaining three-quarters. Spacing runs tight and consistent — 16px and 8px gaps dominate, 12px/4px for compact table and chip padding — producing a dense, form-heavy rhythm rather than generous marketing whitespace.

## Components
- **Host navbar**: page-level, edge-to-edge square bar, 48px tall, transparent background, sticky, 18 items total (nav links, icon utilities, a filled CTA). No visible border radius on any corner (0/0/0/0) — a true full-bleed technical bar, distinct from the bounded storefront bar beneath it.
- **Storefront navbar (inside the stage)**: bounded to the theme's contained width, sits on `#FDFBE4`, logo mark left, nav labels center, icon cluster + CTA right. Its CTA is `#15110C` fill, `#FFFFFF` text, 9999px radius, 32px height, 8px 12px padding — a small dark pill, not the page's loud blue.
- **Hero primary button** (observed, in the 3-up "Add to cart" row): a solid cobalt `#225BFF` fill with white text, 8px radius (slightly-rounded, near-square corners), 40px height, 12px 16px padding — this is the storefront's true primary action, repeated identically ×3, one per product card, paired with a small quantity stepper to its left.
- **Utility glass button** (checkout/help context): `rgba(5, 54, 89, 0.1)` translucent navy fill, `#15110C` text, full 9999px pill, 36px height — a secondary/tertiary control, never the hero action.
- **Footer-band CTA**: cobalt `#225BFF` fill, white text, but a distinctly rounder 16px radius and 40px height — used once, lower on the page, visually softer-cornered than the hero's 8px buttons.
- **Product card family** (×3, one row): transparent/flush wrappers, zero own radius/padding; each carries a full-bleed sky-blue photo tile (rounded corners on the image itself, not measured on the wrapper) covering roughly two-thirds of card height, a pastel status chip, a headline-md product name, a body-text description line, and the quantity+CTA pair at the base.
- **Checkout panel**: cream `#FDFBE4`-toned card, radius ~12-16px, holds stacked form fields (email, shipping radio list with prices, card fields, country select, a checkbox, then a full-width primary button).
- **AI chat/assistant panel**: white surface, 16px radius, shadow `rgba(0, 0, 0, 0.1) 0px 1px 1px 0px, rgba(0, 0, 0, 0.1) 0px 2px 8px 0px`, `backdrop-filter: blur(12px)` — glass-adjacent elevation; internally a scrolling message thread, a structured order-summary sub-card (line items, shipping, ETA badge, tracking link), three outline action chips, and a bottom composer bar with icon buttons and a circular send button.
- **Inventory table band**: header row with search input, three filter dropdowns (categories/locations/tags), a view toggle, and a full-width warning banner chip above the rows; each row holds a checkbox, a small square thumbnail, item name + subtext, an availability number, a location label, and a colored status tag with an overflow menu.
- **Revenue/stat sidebar**: one oversized numeral stat (host figure) beside a smaller percentage-delta stat, a divider, then a 4-row activity list pairing a small icon, order label + timestamp, and a signed dollar amount right-aligned.
- **Host footer**: plain white background, small logo mark, a single row of ~6 text links, a right-aligned row of ~6 social icon glyphs, and a bottom legal strip with copyright — flat, borderless, zero elevation.

## Graphics & Effects
No large-area gradients render anywhere in the composition — this system is flat-fill throughout; color blocking (cream stage vs. white host vs. sky-blue photo tiles) does all the compositional work a gradient might otherwise do. The only elevation cues are soft, tight shadows: `rgba(29, 28, 17, 0.05) 0px 2px 4px 0px, rgba(29, 28, 17, 0.1) 0px 4px 8px 0px` lifts the cream panels barely off the page, and `rgba(0, 0, 0, 0.1) 0px 1px 1px 0px, rgba(0, 0, 0, 0.1) 0px 2px 8px 0px` gives the chat/assistant surface a slightly crisper lift. A single `backdrop-filter: blur(12px)` marks that chat panel as the system's one glass surface — used sparingly, on a floating assistant overlay only, not on cards or the navbar. Product imagery sits on flat sky-blue fields with no scrim, photographed/rendered at high enough contrast that no gradient overlay is needed for legibility.

## Motion
Interactions resolve fast and softly: background/color transitions run at 95ms–175ms on `cubic-bezier(0.24, 1, 0.4, 1)`, an ease-out-leaning curve tuned for snappy hover and state changes rather than dramatic entrances. Text-decoration and color shifts on links share the slowest 175ms step. Named keyframe animations exist for micro state changes (toggle, chip, badge transitions) and CSS scroll-driven animation is present, suggesting scroll-triggered reveals on the marketing-adjacent sections — but nothing in the system relies on long, showy motion; every timing value sits under 200ms, keeping the feel utilitarian and immediate.

## Guardrails
- Never let the cobalt `#225BFF` bleed into backgrounds or large fills — it is a button/link/border accent only, rationed to small controls.
- Keep the script accent face (Sarina) to a short two-line headline moment; do not apply it to body copy, labels, or repeat it elsewhere.
- Do not round the flush product-card wrappers — their zero-radius/zero-padding transparency is deliberate; rounding lives only in the embedded photo tile.
- Preserve the white host chrome vs. cream staged-theme contrast; do not unify them into one background.
- Reserve `backdrop-filter: blur(12px)` glass treatment for the floating assistant/chat surface only — do not apply it to standard cards or the navbar.
- Keep body text in a serif (Times New Roman) against Outfit/Figtree sans UI chrome — do not convert body copy to a sans face.