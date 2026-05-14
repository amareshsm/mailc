/**
 * Color parsing and WCAG contrast calculation utilities.
 *
 * Parses hex, rgb(), rgba(), and CSS named colors into RGB tuples.
 * Calculates relative luminance and WCAG 2.1 contrast ratios.
 *
 * Used by the contrast checker to detect low-contrast text in compiled email HTML.
 * Browser-safe — no Node.js dependencies.
 *
 * @module utils/color
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** An RGB color with channels in the 0–255 range. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Result of a WCAG contrast ratio check. */
export interface ContrastResult {
  /** The contrast ratio (e.g. 4.5, 7.0). Always >= 1. */
  ratio: number;
  /** Whether the ratio meets WCAG AA for normal text (>= 4.5:1). */
  meetsAA: boolean;
  /** Whether the ratio meets WCAG AAA for normal text (>= 7:1). */
  meetsAAA: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** WCAG AA minimum contrast ratio for normal text. */
const WCAG_AA_THRESHOLD = 4.5;

/** WCAG AAA minimum contrast ratio for normal text. */
const WCAG_AAA_THRESHOLD = 7;

/**
 * CSS named colors -> hex values.
 *
 * Only includes colors commonly used in email templates.
 */
const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  maroon: '#800000',
  olive: '#808000',
  lime: '#00ff00',
  aqua: '#00ffff',
  teal: '#008080',
  navy: '#000080',
  fuchsia: '#ff00ff',
  purple: '#800080',
  orange: '#ffa500',
  pink: '#ffc0cb',
  brown: '#a52a2a',
  coral: '#ff7f50',
  crimson: '#dc143c',
  darkblue: '#00008b',
  darkgray: '#a9a9a9',
  darkgrey: '#a9a9a9',
  darkgreen: '#006400',
  darkred: '#8b0000',
  gold: '#ffd700',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lightblue: '#add8e6',
  lightgray: '#d3d3d3',
  lightgrey: '#d3d3d3',
  lightgreen: '#90ee90',
  lightyellow: '#ffffe0',
  linen: '#faf0e6',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  oldlace: '#fdf5e6',
  orangered: '#ff4500',
  orchid: '#da70d6',
  peachpuff: '#ffdab9',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  sienna: '#a0522d',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  whitesmoke: '#f5f5f5',
  yellowgreen: '#9acd32',
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Regex for 3-digit hex: #rgb */
const HEX3_RE = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;

/** Regex for 6-digit hex: #rrggbb */
const HEX6_RE = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

/** Regex for rgb(r, g, b). */
const RGB_RE = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;

/** Regex for rgba(r, g, b, a). */
const RGBA_RE = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([\d.]+)\s*\)$/i;

/**
 * Parses a CSS color string into an RGB tuple.
 *
 * Supports: #rgb, #rrggbb, rgb(r,g,b), and CSS named colors.
 * Returns null for unparseable values, rgba() with alpha < 1,
 * transparent, inherit, currentColor, CSS variables, etc.
 *
 * @param color - The CSS color string.
 * @returns Parsed RGB, or null if not parseable to an opaque color.
 */
export function parseColor(color: string): RGB | null {
  const trimmed = color.trim().toLowerCase();

  if (
    trimmed === '' ||
    trimmed === 'transparent' ||
    trimmed === 'inherit' ||
    trimmed === 'initial' ||
    trimmed === 'unset' ||
    trimmed === 'currentcolor' ||
    trimmed.startsWith('var(')
  ) {
    return null;
  }

  // Named color
  const namedHex = NAMED_COLORS[trimmed];
  if (namedHex) {
    return parseHex(namedHex);
  }

  // Hex
  if (trimmed.startsWith('#')) {
    return parseHex(trimmed);
  }

  // rgba() — only accept if alpha is exactly 1
  const rgbaMatch = RGBA_RE.exec(trimmed);
  if (rgbaMatch) {
    const alpha = parseFloat(rgbaMatch[4] as string);
    if (alpha < 1) {
      return null;
    }
    return clampRGB(
      parseInt(rgbaMatch[1] as string, 10),
      parseInt(rgbaMatch[2] as string, 10),
      parseInt(rgbaMatch[3] as string, 10),
    );
  }

  // rgb()
  const rgbMatch = RGB_RE.exec(trimmed);
  if (rgbMatch) {
    return clampRGB(
      parseInt(rgbMatch[1] as string, 10),
      parseInt(rgbMatch[2] as string, 10),
      parseInt(rgbMatch[3] as string, 10),
    );
  }

  return null;
}

/**
 * Checks whether a CSS color string represents an opaque color.
 *
 * @param color - The CSS color string.
 * @returns true if the color is opaque and parseable.
 */
export function isOpaqueColor(color: string): boolean {
  return parseColor(color) !== null;
}

// ---------------------------------------------------------------------------
// Luminance & Contrast
// ---------------------------------------------------------------------------

/**
 * Calculates the relative luminance of an RGB color per WCAG 2.1.
 *
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 * @param rgb - The RGB color.
 * @returns Relative luminance in the range [0, 1].
 */
export function relativeLuminance(rgb: RGB): number {
  const r = linearize(rgb.r / 255);
  const g = linearize(rgb.g / 255);
  const b = linearize(rgb.b / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates the WCAG 2.1 contrast ratio between two colors.
 *
 * @see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 * @param fg - Foreground (text) color.
 * @param bg - Background color.
 * @returns The contrast ratio, rounded to 2 decimal places.
 */
export function contrastRatio(fg: RGB, bg: RGB): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Checks whether two colors meet WCAG contrast thresholds.
 *
 * @param fg - Foreground (text) color.
 * @param bg - Background color.
 * @returns Contrast result with ratio and AA/AAA pass/fail.
 */
export function checkContrast(fg: RGB, bg: RGB): ContrastResult {
  const ratio = contrastRatio(fg, bg);
  return {
    ratio,
    meetsAA: ratio >= WCAG_AA_THRESHOLD,
    meetsAAA: ratio >= WCAG_AAA_THRESHOLD,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Parses a hex color string (#rgb or #rrggbb) into RGB.
 *
 * @param hex - The hex string.
 * @returns Parsed RGB, or null if invalid format.
 */
function parseHex(hex: string): RGB | null {
  const match3 = HEX3_RE.exec(hex);
  if (match3) {
    return {
      r: parseInt((match3[1] as string) + (match3[1] as string), 16),
      g: parseInt((match3[2] as string) + (match3[2] as string), 16),
      b: parseInt((match3[3] as string) + (match3[3] as string), 16),
    };
  }

  const match6 = HEX6_RE.exec(hex);
  if (match6) {
    return {
      r: parseInt(match6[1] as string, 16),
      g: parseInt(match6[2] as string, 16),
      b: parseInt(match6[3] as string, 16),
    };
  }

  return null;
}

/**
 * Clamps RGB channels to the 0-255 range.
 *
 * @param r - Red channel.
 * @param g - Green channel.
 * @param b - Blue channel.
 * @returns Clamped RGB.
 */
function clampRGB(r: number, g: number, b: number): RGB {
  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b)),
  };
}

/**
 * Linearizes an sRGB channel value for luminance calculation.
 *
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 * @param channel - sRGB channel in the range [0, 1].
 * @returns Linearized value.
 */
function linearize(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}
