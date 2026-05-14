/**
 * Dark mode post-processor for compiled email HTML.
 *
 * Implements the "Progressively Enhanced Dark Mode" strategy:
 *
 * 1. **Meta tags** — `<meta name="color-scheme" content="light dark">` and
 *    `<meta name="supported-color-schemes" content="light dark">` tell supporting
 *    clients (Apple Mail, iOS, Outlook web) that the email is dark-mode-aware,
 *    preventing forced color inversion.
 *
 * 2. **`@media (prefers-color-scheme: dark)`** — Overrides inline `color` and
 *    `background-color` values using the developer-supplied `colorMapping`.
 *    Works in Apple Mail, iOS, Gmail (partial), Outlook web/mac.
 *
 * 3. **Class injection** — Each HTML element whose inline color appears in the
 *    mapping gets a deterministic CSS class (`dm-bg-{index}` or `dm-c-{index}`).
 *    The `@media` block targets those classes with `!important` overrides.
 *
 * Light-mode inline styles are untouched — they remain the universal fallback.
 *
 * @module post-processor/dark-mode
 * @see docs/decisions/004-why-dark-mode.md
 */

import type { DarkModeConfig } from '../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of dark mode post-processing. */
export interface DarkModeResult {
  /** The transformed HTML. */
  html: string;
}

/** A single color override rule generated from the mapping. */
interface DarkModeRule {
  /** The CSS class name applied to the element. */
  className: string;
  /** The CSS property (`background-color` or `color`). */
  property: string;
  /** The dark-mode replacement value. */
  darkValue: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Color-scheme meta tags that prevent forced inversion. */
const COLOR_SCHEME_META =
  `<meta name="color-scheme" content="light dark">` +
  `<meta name="supported-color-schemes" content="light dark">`;

/** Marker where we inject meta tags (after existing meta tags). */
const HEAD_CLOSE_TAG = '</head>';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Applies dark mode transformations to compiled email HTML.
 *
 * When `enabled` is `false`, returns the HTML unchanged.
 *
 * When `enabled` is `true`:
 * 1. Injects `color-scheme` meta tags into `<head>`.
 * 2. Scans inline `style="..."` for `color` and `background-color` values
 *    that exist in `colorMapping`.
 * 3. Adds deterministic CSS classes to matched elements.
 * 4. Generates a `@media (prefers-color-scheme: dark)` block and injects
 *    it into `<head>` as a `<style>` tag.
 *
 * @param html   - The compiled email HTML (post-assembly, pre-optimization).
 * @param config - Dark mode configuration.
 * @returns The result with transformed HTML.
 */
export function applyDarkMode(
  html: string,
  config: DarkModeConfig,
): DarkModeResult {
  if (!config.enabled) {
    return { html };
  }

  // Normalize color mapping keys to lowercase for case-insensitive matching
  const normalizedMapping = normalizeColorMapping(config.colorMapping);

  if (Object.keys(normalizedMapping).length === 0) {
    // Enabled but no color mapping — just inject meta tags (layer 2 only)
    return { html: injectMetaTags(html) };
  }

  // Build the lookup of light-color → { index, darkValue } for each property type
  const bgLookup = buildColorLookup(normalizedMapping, 'bg');
  const colorLookup = buildColorLookup(normalizedMapping, 'c');

  // Scan and transform HTML
  const rules: DarkModeRule[] = [];
  let transformed = html;

  // Process background-color matches
  transformed = processInlineColors(
    transformed,
    'background-color',
    bgLookup,
    rules,
  );

  // Process color matches
  transformed = processInlineColors(
    transformed,
    'color',
    colorLookup,
    rules,
  );

  // Inject meta tags
  transformed = injectMetaTags(transformed);

  // Generate and inject @media block
  if (rules.length > 0) {
    const mediaBlock = buildMediaBlock(rules);
    transformed = injectStyleBlock(transformed, mediaBlock);
  }

  return { html: transformed };
}

// ---------------------------------------------------------------------------
// Color mapping helpers
// ---------------------------------------------------------------------------

/** A lookup entry: light color → class name + dark value. */
interface ColorLookupEntry {
  /** The CSS class name (e.g. `dm-bg-0`). */
  className: string;
  /** The dark-mode replacement color. */
  darkValue: string;
}

/**
 * Normalizes all color mapping keys to lowercase hex.
 *
 * @param mapping - The raw color mapping from config.
 * @returns Normalized mapping with lowercase keys.
 */
function normalizeColorMapping(
  mapping: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [light, dark] of Object.entries(mapping)) {
    result[light.toLowerCase()] = dark.toLowerCase();
  }
  return result;
}

/**
 * Builds a lookup map from light hex colors to class names and dark values.
 *
 * @param mapping - Normalized color mapping.
 * @param prefix  - Class prefix (`"bg"` for background-color, `"c"` for color).
 * @returns Map of lowercase hex → lookup entry.
 */
function buildColorLookup(
  mapping: Record<string, string>,
  prefix: string,
): Map<string, ColorLookupEntry> {
  const lookup = new Map<string, ColorLookupEntry>();
  let index = 0;
  for (const [light, dark] of Object.entries(mapping)) {
    lookup.set(light, {
      className: `dm-${prefix}-${index}`,
      darkValue: dark,
    });
    index++;
  }
  return lookup;
}

// ---------------------------------------------------------------------------
// HTML scanning and class injection
// ---------------------------------------------------------------------------

/**
 * Scans HTML for inline style declarations matching `property: <color>` and
 * adds a dark-mode CSS class to those elements.
 *
 * For each element with `style="...{property}:{lightColor}..."` where
 * `lightColor` is in the lookup:
 * 1. Adds the dark-mode class to the element's `class` attribute (or creates one).
 * 2. Records the rule for the `@media` block.
 *
 * @param html     - The HTML string.
 * @param property - CSS property to scan for (`"background-color"` or `"color"`).
 * @param lookup   - Color lookup map.
 * @param rules    - Accumulator for generated rules (mutated).
 * @returns The HTML with dark-mode classes injected.
 */
function processInlineColors(
  html: string,
  property: string,
  lookup: Map<string, ColorLookupEntry>,
  rules: DarkModeRule[],
): string {
  // Track which class names have been recorded to avoid duplicate rules
  const recordedClasses = new Set<string>();

  // Match: style="...property:value..." on any HTML element
  // We need to find elements with inline styles containing the target property
  const styleRegex = /(<[a-z][a-z0-9]*\b)([^>]*?\bstyle="[^"]*?")/gi;

  return html.replace(styleRegex, (fullMatch, tagStart: string, rest: string) => {
    // Extract the style attribute value
    const styleMatch = /\bstyle="([^"]*)"/.exec(rest);
    if (!styleMatch) {
      return fullMatch;
    }

    const styleValue = styleMatch[1] as string;

    // Find the specific property value in the style string
    // Use a regex that handles the property at start, middle, or end of the style
    const propRegex = new RegExp(
      `(?:^|;)\\s*${escapeRegex(property)}\\s*:\\s*([^;]+?)\\s*(?:;|$)`,
      'i',
    );
    const propMatch = propRegex.exec(styleValue);
    if (!propMatch) {
      return fullMatch;
    }

    const rawColorValue = (propMatch[1] as string).trim().toLowerCase();

    // Normalize: strip quotes, trim
    const colorValue = rawColorValue.replace(/['"]/g, '');

    // Check if this color is in our mapping
    const entry = lookup.get(colorValue);
    if (!entry) {
      return fullMatch;
    }

    // Record the rule (only once per unique class)
    if (!recordedClasses.has(entry.className)) {
      rules.push({
        className: entry.className,
        property,
        darkValue: entry.darkValue,
      });
      recordedClasses.add(entry.className);
    }

    // Add the class to the element
    return addClassToElement(tagStart, rest, entry.className);
  });
}

/**
 * Adds a CSS class name to an HTML element.
 *
 * If the element already has a `class` attribute, appends to it.
 * Otherwise, adds a new `class` attribute after the tag name.
 *
 * @param tagStart - The opening part of the tag (e.g. `<td`).
 * @param rest     - The remaining attributes.
 * @param className - The class to add.
 * @returns The reconstructed tag with the class added.
 */
function addClassToElement(
  tagStart: string,
  rest: string,
  className: string,
): string {
  // Check if element already has a class attribute
  const classAttrRegex = /\bclass="([^"]*)"/;
  const classMatch = classAttrRegex.exec(rest);

  if (classMatch) {
    // Append to existing class — but avoid duplicates
    const existingClasses = classMatch[1] as string;
    if (existingClasses.split(/\s+/).includes(className)) {
      return tagStart + rest;
    }
    const newClassValue = existingClasses
      ? `${existingClasses} ${className}`
      : className;
    const newRest = rest.replace(classAttrRegex, `class="${newClassValue}"`);
    return tagStart + newRest;
  }

  // No class attribute — add one right after the tag name
  return tagStart + ` class="${className}"` + rest;
}

// ---------------------------------------------------------------------------
// CSS generation
// ---------------------------------------------------------------------------

/**
 * Builds the `@media (prefers-color-scheme: dark)` CSS block.
 *
 * Each rule uses `!important` to override inline styles (which have
 * higher specificity than `<style>` blocks in email clients).
 *
 * @param rules - The collected dark mode rules.
 * @returns The complete `@media` block string.
 */
function buildMediaBlock(rules: DarkModeRule[]): string {
  const ruleStrings = rules.map(
    (r) => `.${r.className}{${r.property}:${r.darkValue}!important;}`,
  );
  return `@media(prefers-color-scheme:dark){${ruleStrings.join('')}}`;
}

// ---------------------------------------------------------------------------
// HTML injection
// ---------------------------------------------------------------------------

/**
 * Injects dark mode color-scheme meta tags into the `<head>`.
 *
 * Placed right before `</head>` to avoid interfering with the
 * position of existing meta tags, title, and style blocks.
 *
 * @param html - The HTML string.
 * @returns The HTML with meta tags injected.
 */
function injectMetaTags(html: string): string {
  const idx = html.indexOf(HEAD_CLOSE_TAG);
  if (idx === -1) {
    return html;
  }
  return html.slice(0, idx) + COLOR_SCHEME_META + html.slice(idx);
}

/**
 * Injects a `<style>` block into the `<head>`.
 *
 * @param html  - The HTML string.
 * @param css   - The CSS to inject.
 * @returns The HTML with the style block injected.
 */
function injectStyleBlock(html: string, css: string): string {
  const idx = html.indexOf(HEAD_CLOSE_TAG);
  if (idx === -1) {
    return html;
  }
  return html.slice(0, idx) + `<style>${css}</style>` + html.slice(idx);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Escapes special regex characters in a string.
 *
 * @param str - The string to escape.
 * @returns The regex-safe string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
