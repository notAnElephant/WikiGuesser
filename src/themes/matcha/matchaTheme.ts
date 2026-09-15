/**
 * Matcha Theme
 *
 * An earthy green theme inspired by matcha tea and natural botanicals.
 * Core palette: #3E481D, #707E46, #C0CBA9, #F0F0E0, #FFFFFF
 * Uses Playwrite US Trad for headings and DM Sans for body text.
 */

import {defineTheme} from '@astryxdesign/core/theme';
import {chocolateTheme, chocolateSyntax} from '../chocolate/chocolateTheme';
import {matchaIconRegistry} from './icons';

export const matchaTheme = defineTheme({
  name: 'matcha',
  // Matcha retains its type and shape identity while sharing Chocolate's
  // semantic and syntax palette, so theme switching never changes colors.
  extends: chocolateTheme,

  typography: {
    // base 16 / ratio 1.25 — aligned with the other themes' geometric scale.
    scale: {base: 16, ratio: 1.25},
    body: {
      family: 'DM Sans',
      fallbacks:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    heading: {
      family: 'Playwrite US Trad',
      fallbacks: 'Georgia, "Times New Roman", Times, serif',
    },
    code: {
      family: 'JetBrains Mono',
      fallbacks: '"SF Mono", Monaco, Consolas, monospace',
    },
  },

  motion: {fast: 125, medium: 300, slow: 700, ratio: 0.75},

  syntax: chocolateSyntax,

  tokens: {
    // Color and syntax tokens inherit directly from chocolateTheme.

    // =========================================================================
    // Spacing
    // =========================================================================
    '--spacing-0-5': '3px',
    '--spacing-1': '6px',
    '--spacing-1-5': '9px',
    '--spacing-2': '12px',
    '--spacing-3': '18px',
    '--spacing-4': '24px',
    '--spacing-5': '30px',
    '--spacing-6': '36px',
    '--spacing-7': '42px',
    '--spacing-8': '48px',
    '--spacing-9': '54px',
    '--spacing-10': '60px',
    '--spacing-11': '66px',
    '--spacing-12': '72px',

    // =========================================================================
    // Radius — soft and rounded
    // =========================================================================
    '--radius-inner': '6px',
    '--radius-element': '12px',
    '--radius-container': '18px',
    '--radius-page': '42px',

    // No explicit --font-size-* overrides — font sizes come from
    // typography.scale above, keeping the scale the single source of truth.

    // =========================================================================
    // Element sizes
    // =========================================================================
    '--size-element-sm': '36px',
    '--size-element-md': '40px',
    '--size-element-lg': '44px',

    // =========================================================================
    // Shadows
    // =========================================================================
  },

  components: {
    button: {
      base: {
        borderRadius: 'var(--radius-full)',
      },
    },
    card: {
      base: {
        borderRadius: 'var(--radius-page)',
        padding: 'var(--spacing-3)',
      },
    },
    section: {
      base: {
        padding: 'var(--spacing-3)',
      },
    },
  },

  icons: matchaIconRegistry,
});
