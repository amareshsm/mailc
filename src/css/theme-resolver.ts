/**
 * Theme resolver — deep-merges user theme overrides with the default theme.
 *
 * Handles:
 * - `theme.extend` deep merge (user values add to/override defaults)
 * - Nested color flattening (`brand.dark` → flat lookup key `brand-dark`)
 * - `rem` → `px` conversion in resolved values
 *
 * @module css/theme-resolver
 */
import type { ResolvedTheme } from '../types.js';
import { DEFAULT_THEME } from './theme-defaults.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Shape of the user-provided theme config inside `mailc.config.js`. */
export interface UserThemeConfig {
  extend?: Partial<ResolvedTheme>;
}

/**
 * Resolves a user theme config into a fully populated `ResolvedTheme`.
 *
 * - Deep-merges `extend` values on top of `DEFAULT_THEME`
 * - Converts any `rem` string values to `px`
 * - Returns the default theme unchanged when no config is provided
 *
 * @param userTheme - The user's `theme` block from `mailc.config.js`.
 * @returns A complete `ResolvedTheme` ready for class resolution.
 */
export function resolveTheme(userTheme?: UserThemeConfig): ResolvedTheme {
  if (!userTheme?.extend) {
    return DEFAULT_THEME;
  }

  const ext = userTheme.extend;

  return {
    colors: mergeColors(DEFAULT_THEME.colors, ext.colors),
    spacing: mergeStringMap(DEFAULT_THEME.spacing, ext.spacing),
    fontSize: mergeFontSize(DEFAULT_THEME.fontSize, ext.fontSize),
    fontFamily: mergeFontFamily(DEFAULT_THEME.fontFamily, ext.fontFamily),
    fontWeight: mergeStringMap(DEFAULT_THEME.fontWeight, ext.fontWeight),
    lineHeight: mergeStringMap(DEFAULT_THEME.lineHeight, ext.lineHeight),
    letterSpacing: mergeStringMap(DEFAULT_THEME.letterSpacing, ext.letterSpacing),
    borderRadius: mergeStringMap(DEFAULT_THEME.borderRadius, ext.borderRadius),
    borderWidth: mergeStringMap(DEFAULT_THEME.borderWidth, ext.borderWidth),
    maxWidth: mergeStringMap(DEFAULT_THEME.maxWidth, ext.maxWidth),
    width: mergeStringMap(DEFAULT_THEME.width, ext.width),
    height: mergeStringMap(DEFAULT_THEME.height, ext.height),
  };
}

// ---------------------------------------------------------------------------
// rem → px conversion
// ---------------------------------------------------------------------------

/** Base pixel value for `1rem`. */
const REM_BASE = 16;

/** Regex matching a `rem` value like `"1.5rem"`. */
const REM_PATTERN = /^(-?\d+(?:\.\d+)?)rem$/;

/**
 * Converts a `rem` string to `px`. Returns the input unchanged if not `rem`.
 *
 * @param value - CSS value string, e.g. `"1.5rem"` or `"16px"`.
 * @returns The value in `px` if it was `rem`, otherwise unchanged.
 */
export function remToPx(value: string): string {
  const match = REM_PATTERN.exec(value);
  if (!match) return value;
  const px = parseFloat(match[1] as string) * REM_BASE;
  return `${px}px`;
}

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

/**
 * Merges two `Record<string, string>` maps. User values override defaults.
 * Converts any `rem` values to `px`.
 */
function mergeStringMap(
  base: Record<string, string>,
  ext?: Record<string, string>,
): Record<string, string> {
  if (!ext) return base;

  const merged: Record<string, string> = { ...base };
  for (const [key, val] of Object.entries(ext)) {
    merged[key] = remToPx(val);
  }
  return merged;
}

/**
 * Merges color maps. Supports flat strings and nested objects.
 * User values override defaults at the same key path.
 */
function mergeColors(
  base: Record<string, string | Record<string, string>>,
  ext?: Record<string, string | Record<string, string>>,
): Record<string, string | Record<string, string>> {
  if (!ext) return base;

  const merged: Record<string, string | Record<string, string>> = { ...base };

  for (const [key, val] of Object.entries(ext)) {
    const existing = merged[key];

    if (typeof val === 'string') {
      // User provides a flat string — overwrite whatever was there
      merged[key] = val;
    } else if (typeof val === 'object') {
      // User provides a nested object — deep merge with existing
      if (typeof existing === 'object') {
        merged[key] = { ...existing, ...val };
      } else {
        merged[key] = { ...val };
      }
    }
  }

  return merged;
}

/**
 * Merges fontSize maps. Values can be plain strings or `[string, Record]` tuples.
 */
function mergeFontSize(
  base: Record<string, string | [string, Record<string, string>]>,
  ext?: Record<string, string | [string, Record<string, string>]>,
): Record<string, string | [string, Record<string, string>]> {
  if (!ext) return base;

  const merged: Record<string, string | [string, Record<string, string>]> = { ...base };

  for (const [key, val] of Object.entries(ext)) {
    if (typeof val === 'string') {
      merged[key] = remToPx(val);
    } else if (Array.isArray(val)) {
      merged[key] = [remToPx(val[0]), val[1]];
    }
  }

  return merged;
}

/** Merges fontFamily maps. User families fully replace defaults per key. */
function mergeFontFamily(
  base: Record<string, string[]>,
  ext?: Record<string, string[]>,
): Record<string, string[]> {
  if (!ext) return base;
  return { ...base, ...ext };
}
