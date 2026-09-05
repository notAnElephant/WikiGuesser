/**
 * Chocolate Theme
 *
 * Warm Chocolate shapes with an onyx, turquoise and pastel palette.
 * Core palette: #25d4c2, #111111, #b9a394, #d4c5c7, #dad4ef
 * Uses Fraunces for headings and Albert Sans for body text.
 */

import {defineTheme, defineSyntaxTheme} from '@astryxdesign/core/theme';
import {chocolateIconRegistry} from './icons';

/** Syntax colors share the UI's accessible light/dark color roles. */
const chocolateSyntax = defineSyntaxTheme({
  name: 'xds-chocolate',
  tokens: {
    keyword: ['#006e64', '#25d4c2'],
    string: ['#276749', '#8acda3'],
    comment: ['#6b5b51', '#b9a394'],
    number: ['#805300', '#e8bd67'],
    function: ['#625085', '#dad4ef'],
    type: ['#625085', '#dad4ef'],
    variable: ['#111111', '#d4c5c7'],
    operator: ['#6b5b51', '#b9a394'],
    constant: ['#805300', '#e8bd67'],
    tag: ['#b13f4b', '#ee939c'],
    attribute: ['#006e64', '#25d4c2'],
    property: ['#006e64', '#25d4c2'],
    punctuation: ['#6b5b51', '#b9a394'],
    background: ['#fffaf7', '#1c1918'],
  },
});

export const chocolateTheme = defineTheme({
  name: 'chocolate',

  typography: {
    scale: {base: 14, ratio: 1.2},
    body: {
      family: 'var(--font-albert-sans)',
      fallbacks:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    heading: {
      family: 'var(--font-fraunces)',
      fallbacks: 'Georgia, "Times New Roman", Times, serif',
      weights: {3: 'bold', 4: 'bold'},
    },
    code: {
      family: 'var(--font-jetbrains-mono)',
      fallbacks: '"SF Mono", Monaco, Consolas, monospace',
    },
  },

  motion: {fast: 125, medium: 300, slow: 700, ratio: 0.75},

  syntax: chocolateSyntax,

  tokens: {
    // =========================================================================
    // Colors — original palette plus mode-specific surfaces and readable shades.
    // Tuples are [light, dark]. Accent fills keep Onyx labels in both modes;
    // light-mode accent text uses deep teal rather than bright turquoise.
    '--focus-outline-color': 'var(--color-text-accent)',
    '--color-accent': ['#25d4c2', '#25d4c2'],
    '--color-accent-muted': ['#d5f4ef', '#18322e'],
    '--color-neutral': ['#e8dfd9', '#302926'],
    '--color-background-surface': ['#fffaf7', '#1c1918'],
    '--color-background-body': ['#f7f2ee', '#111111'],
    '--color-overlay': ['#11111180', '#111111cc'],
    '--color-overlay-hover': ['#1111110d', '#d4c5c70d'],
    '--color-overlay-pressed': ['#1111111a', '#d4c5c71a'],
    '--color-background-muted': ['#eee5df', '#302926'],
    '--color-text-primary': ['#111111', '#d4c5c7'],
    '--color-text-secondary': ['#6b5b51', '#b9a394'],
    '--color-text-disabled': ['#97877c', '#82736a'],
    '--color-text-accent': ['#006e64', '#25d4c2'],
    '--color-on-dark': '#f7f2ee',
    '--color-on-light': '#111111',
    '--color-on-accent': '#111111',
    '--color-on-success': ['#ffffff', '#111111'],
    '--color-on-error': ['#ffffff', '#111111'],
    '--color-on-warning': ['#ffffff', '#111111'],
    '--color-icon-accent': ['#006e64', '#25d4c2'],
    '--color-icon-primary': ['#111111', '#d4c5c7'],
    '--color-icon-secondary': ['#6b5b51', '#b9a394'],
    '--color-icon-disabled': ['#97877c', '#82736a'],
    '--color-background-card': ['#fffaf7', '#241f1c'],
    '--color-background-popover': ['#fffaf7', '#241f1c'],
    '--color-background-inverted': ['#111111', '#d4c5c7'],
    '--color-success': ['#276749', '#8acda3'],
    '--color-success-muted': ['#e1eee4', '#24372b'],
    '--color-error': ['#b13f4b', '#ee939c'],
    '--color-error-muted': ['#f8e5e6', '#3b2428'],
    '--color-warning': ['#805300', '#e8bd67'],
    '--color-warning-muted': ['#f5e9d0', '#3b3020'],
    '--color-border': ['#d4c5c7', '#51443d'],
    '--color-border-emphasized': ['#8b776a', '#9c8778'],
    '--color-skeleton': ['#d4c5c7', '#51443d'],
    '--color-shadow': ['#1111111a', '#0000004d'],
    '--color-tint-hover': ['black', 'white'],

    // Categorical surfaces pair with their own readable foreground colors.
    '--color-background-blue': ['#e2e9f3', '#243044'],
    '--color-border-blue': ['#355b85', '#a8c7ee'],
    '--color-icon-blue': ['#355b85', '#a8c7ee'],
    '--color-text-blue': ['#355b85', '#a8c7ee'],
    '--color-background-cyan': ['#d5f0f0', '#203333'],
    '--color-border-cyan': ['#006a70', '#91d6dc'],
    '--color-icon-cyan': ['#006a70', '#91d6dc'],
    '--color-text-cyan': ['#006a70', '#91d6dc'],
    '--color-background-gray': ['#eee5df', '#302926'],
    '--color-border-gray': ['#6b5b51', '#b9a394'],
    '--color-icon-gray': ['#6b5b51', '#b9a394'],
    '--color-text-gray': ['#6b5b51', '#b9a394'],
    '--color-background-green': ['#e1eee4', '#24372b'],
    '--color-border-green': ['#276749', '#8acda3'],
    '--color-icon-green': ['#276749', '#8acda3'],
    '--color-text-green': ['#276749', '#8acda3'],
    '--color-background-orange': ['#f4e6d9', '#3b2c20'],
    '--color-border-orange': ['#8a4d19', '#e4b080'],
    '--color-icon-orange': ['#8a4d19', '#e4b080'],
    '--color-text-orange': ['#8a4d19', '#e4b080'],
    '--color-background-pink': ['#f5e2ea', '#382630'],
    '--color-border-pink': ['#923e68', '#e4a4c1'],
    '--color-icon-pink': ['#923e68', '#e4a4c1'],
    '--color-text-pink': ['#923e68', '#e4a4c1'],
    '--color-background-purple': ['#dad4ef', '#30293f'],
    '--color-border-purple': ['#625085', '#dad4ef'],
    '--color-icon-purple': ['#625085', '#dad4ef'],
    '--color-text-purple': ['#625085', '#dad4ef'],
    '--color-background-red': ['#f8e5e6', '#3b2428'],
    '--color-border-red': ['#b13f4b', '#ee939c'],
    '--color-icon-red': ['#b13f4b', '#ee939c'],
    '--color-text-red': ['#b13f4b', '#ee939c'],
    '--color-background-teal': ['#d5f4ef', '#18322e'],
    '--color-border-teal': ['#006e64', '#25d4c2'],
    '--color-icon-teal': ['#006e64', '#25d4c2'],
    '--color-text-teal': ['#006e64', '#25d4c2'],
    '--color-background-yellow': ['#f5e9d0', '#3b3020'],
    '--color-border-yellow': ['#805300', '#e8bd67'],
    '--color-icon-yellow': ['#805300', '#e8bd67'],
    '--color-text-yellow': ['#805300', '#e8bd67'],

    // =========================================================================
    // Radius — soft and rounded
    //   --radius-none and --radius-full are always fixed and must never be
    //   scaled by a theme (see defineTheme's radius config docs) — 0 and
    //   9999px respectively, matching @astryxdesign/core's own defaults.
    // =========================================================================
    '--radius-none': '0px',
    '--radius-inner': '0.375rem',
    '--radius-element': '0.625rem',
    '--radius-container': '0.75rem',
    '--radius-page': '1.5rem',
    '--radius-full': '9999px',

    // =========================================================================
    // Shadows — warm-toned
    // =========================================================================
    '--shadow-low': '0 2px 4px #4a35200D, 0 4px 8px #4a35201A',
    '--shadow-med': '0 2px 4px #4a35200D, 0 4px 12px #4a35201A',
    '--shadow-high': '0 4px 6px #4a35201A, 0 12px 24px #4a352026',
    '--shadow-inset-hover': 'inset 0px 0px 0px 2px var(--color-text-accent)',
    '--shadow-inset-selected': 'inset 0px 0px 0px 2px var(--color-text-accent)',
    '--shadow-inset-success': 'inset 0px 0px 0px 2px var(--color-success)',
    '--shadow-inset-warning': 'inset 0px 0px 0px 2px var(--color-warning)',
    '--shadow-inset-error': 'inset 0px 0px 0px 2px var(--color-error)',
  },

  components: {
    button: {
      base: {
        borderRadius: 'var(--radius-full)',
      },
      'variant:secondary': {
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--color-border-emphasized)',
      },
    },

    card: {
      base: {
        padding: 'var(--spacing-3)',
      },
    },

    section: {
      base: {
        padding: 'var(--spacing-3)',
      },
    },
  },

  icons: chocolateIconRegistry,
});
