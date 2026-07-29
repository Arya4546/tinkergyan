/**
 * editor-tokens — the single source of truth for every colour on the editor page.
 *
 * Why this file exists: before it, `tailwind.config.ts`, `scratch-stage.css`,
 * `BlocklyWorkspace.tsx`, `CompileConsole.tsx` and `SerialMonitor.tsx` each
 * invented their own hex values, so every panel drifted a little further from
 * the last one. Three visual languages ended up sharing one screen.
 *
 * It has to live in TypeScript rather than CSS because Blockly bakes colours
 * into SVG attributes at theme-definition time and cannot read CSS custom
 * properties. So the palette is declared here once, handed to Blockly directly,
 * and mirrored onto `:root` as CSS variables for everything else.
 *
 * Surface ramp, lightest to deepest *by role* (not by luminance — in light mode
 * the well is lightest, in dark mode it is the lightest of the dark surfaces):
 *
 *   well    the block canvas. Always the surface blocks sit in.
 *   chrome  title bar, activity rail, status bar, drawer.
 *   panel   toolbox and dock — the frame around the canvas.
 *   raised  chips, inputs, hover states, sprite tiles.
 */

export interface EditorPalette {
  /** Block canvas. Never near-black: saturated Scratch blocks vibrate on it. */
  well: string;
  chrome: string;
  panel: string;
  raised: string;
  line: string;
  lineSoft: string;
  textHi: string;
  textMid: string;
  textLo: string;
  /** Selection / focus / active-nav. Brand indigo. */
  accent: string;
  /** Tinted accent background for active nav items. */
  accentSoft: string;
  /**
   * "Go" — run, success, connected. Semantic only, never decorative.
   *
   * These three and `accent` are brand hues and are fixed, which means on the
   * LIGHT surfaces they only reach 2.4–4.2:1 — below AA. Use them as *fills*
   * (with white text on top) or as icon/indicator colour, never as body text on
   * a light background. In dark mode they clear AA and the restriction relaxes.
   */
  go: string;
  warn: string;
  err: string;
  /** Workspace dot-grid colour. */
  gridDot: string;
  /** Blockly scrollbar. */
  scrollbar: string;

  /**
   * Terminal surfaces — the compile console and serial monitor.
   *
   * These are deliberately **identical in both themes**. A terminal reads as a
   * terminal because it is dark; that is a convention students and teachers
   * already know from every other tool, and inverting it in light mode would
   * make compiler output harder to scan, not easier. Tokenised anyway so the
   * literal hexes stay out of the components.
   */
  termBg: string;
  termSurface: string;
  termLine: string;
  termText: string;
  termDim: string;
}

/** Terminal surfaces. Shared by both palettes — see EditorPalette.termBg. */
const TERMINAL = {
  termBg: '#08080B',
  termSurface: '#101014',
  termLine: '#24242E',
  // 11.9:1 on termBg — comfortably AAA for the 10-11px monospace output runs at.
  termText: '#C7C7D2',
  // 5.9:1 on termBg. Timestamps, counts and empty-state captions render at 9-10px,
  // so this cannot be as dim as it looks like it wants to be: the previous #71717F
  // measured 4.2:1 and the slate-600 it replaced measured 2.6:1, which was simply
  // unreadable. Still ~2x darker than termText, so the hierarchy survives.
  termDim: '#8A8A99',
} as const;

export const LIGHT: EditorPalette = {
  well: '#FCFCFA',
  chrome: '#FFFFFF',
  panel: '#F6F6F3',
  raised: '#FFFFFF',
  line: '#E5E4DE',
  lineSoft: '#EFEEE9',
  textHi: '#1A1A22',
  textMid: '#5B5B6D',
  // 4.9:1 on well. textLo reads as "supplementary", but its consumers are all
  // real text someone parses — Monaco line numbers, Scratch sprite captions — so
  // it has to clear AA. The #92929F it replaces measured 3.0:1.
  textLo: '#6E6E7A',
  accent: '#6C63FF',
  accentSoft: '#F0EFFF',
  go: '#00B48F',
  warn: '#E09025',
  err: '#DB4B50',
  gridDot: 'rgba(30,30,50,0.085)',
  scrollbar: '#D6D5CE',
  ...TERMINAL,
};

export const DARK: EditorPalette = {
  // #232330 is deliberate and load-bearing. Scratch runs blocks on #F9F9F9 and
  // Blockly's own dark themes use mid-tones; push this to near-black and the
  // saturated block palette vibrates against it. The canvas stays the lightest
  // surface in BOTH themes — it just shifts from paper to slate.
  well: '#232330',
  chrome: '#191921',
  panel: '#1E1E28',
  raised: '#272733',
  line: '#30303E',
  lineSoft: '#242430',
  textHi: '#F0F0F5',
  textMid: '#9E9EB2',
  // 5.0:1 on well — see the LIGHT note. Was #6E6E82 at 3.1:1.
  textLo: '#9090A4',
  accent: '#8B84FF',
  accentSoft: '#26243D',
  go: '#14D3AC',
  warn: '#FFB347',
  err: '#FF6B6B',
  gridDot: 'rgba(255,255,255,0.075)',
  scrollbar: '#3A3A4A',
  ...TERMINAL,
};

/**
 * Scratch block category colours. Untouched from the official palette — students
 * arrive already knowing that blue is motion and purple is looks, and that
 * recognition is worth more than any consistency we could impose on it.
 */
export const CATEGORY_COLOURS = {
  events: '#FFBF00',
  motion: '#4C97FF',
  looks: '#9966FF',
  sound: '#D65CD6',
  control: '#FFAB19',
  sensing: '#5CB1D6',
  operators: '#59C059',
  variables: '#FF8C1A',
} as const;

/** CSS custom-property name for a palette key: `well` → `--ed-well`. */
const cssVarName = (key: keyof EditorPalette) =>
  `--ed-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/**
 * Mirror a palette onto `:root` as CSS custom properties so stylesheets can read
 * what Blockly was handed directly. Called on theme change; safe to call twice.
 */
export function applyEditorTokens(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  const palette = theme === 'dark' ? DARK : LIGHT;
  const root = document.documentElement;
  for (const key of Object.keys(palette) as (keyof EditorPalette)[]) {
    root.style.setProperty(cssVarName(key), palette[key]);
  }
}

/** The palette for a theme. Blockly and the panels both read this. */
export const paletteFor = (theme: 'light' | 'dark'): EditorPalette =>
  theme === 'dark' ? DARK : LIGHT;
