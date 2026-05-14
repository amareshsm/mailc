/**
 * Default configuration and config merging for mailc.
 *
 * Defines the built-in defaults for every config option.
 * Config file loading (file I/O) lives in `src/cli.ts` — this module
 * is browser-safe and never imports from `node:*`.
 *
 * @module config
 */
import type { MailcConfig } from './types.js';

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

/**
 * The default set of email clients mailc targets when no `targetClients`
 * override is provided. Covers ~95% of global email opens (Litmus 2023).
 *
 * Pass this to `buildClassificationMap()` or spread it when constructing
 * a custom client list:
 * ```ts
 * compile(source, { targetClients: [...DEFAULT_CLIENTS, 'samsung-email.*'] })
 * ```
 */
export const DEFAULT_CLIENTS: readonly string[] = [
  'gmail.*',
  'apple-mail.*',
  'outlook.*',
  'yahoo.*',
  'samsung-email.android',
];

/**
 * The complete default mailc configuration.
 *
 * Used as the base when no user config is provided, or as the
 * fallback for any option not overridden by the user.
 */
export const DEFAULT_CONFIG: MailcConfig = {
  width: 600,
  // `undefined` = no caniemail-driven client gating. The user opts in
  // explicitly via `targetClients: 'default'` (the curated 5-client list)
  // or a custom string[]. Hardcoded structural safety (ALWAYS_BREAKING /
  // ALWAYS_NO_EFFECT) still runs regardless of this field.
  targetClients: undefined,
  compatibilityMode: 'liberal',
  responsive: {
    breakpoint: 480,
  },
  darkMode: {
    enabled: false,
    strategy: 'media-query',
    colorMapping: {},
  },
  accessibility: {
    enabled: false,
    warnMissingAlt: true,
    enforceAltText: false,
    checkContrast: true,
  },
  output: {
    minify: false,
    comments: false,
  },
  templateEngine: {
    strictVariables: false,
  },
  styling: {
    // Default is 'attribute' — set CSS values directly on mc-* elements
    // (e.g. color="#ff0000", padding="16px"). The familiar HTML-style API.
    //
    // 'class' is a limited-support alternative that compiles Tailwind-style
    // utility classes to inline styles. Some CSS shorthands and specific
    // attributes (e.g. inner-background-color) have no class equivalent
    // today — opt in only if your project standardises on Tailwind utilities.
    templateStyle: 'attribute',
  },
};

// ---------------------------------------------------------------------------
// Merge helper
// ---------------------------------------------------------------------------

/**
 * Shallow-merges a partial user config on top of the defaults.
 *
 * Each top-level key that is an object is merged one level deep so
 * users only need to override the options they care about:
 *
 * ```ts
 * mergeConfig({ compatibilityMode: 'strict' })
 * // → full MailcConfig with compatibilityMode = 'strict', everything else default
 * ```
 *
 * @param overrides - Partial user config to merge on top of defaults.
 * @returns A fully populated `MailcConfig`.
 */
export function mergeConfig(overrides?: Partial<MailcConfig>): MailcConfig {
  if (!overrides) {
    return { ...DEFAULT_CONFIG };
  }

  return {
    width: overrides.width ?? DEFAULT_CONFIG.width,
    // `targetClients` semantics:
    //   - omitted (undefined)  → keep DEFAULT_CONFIG (also undefined) — no gating
    //   - explicit array      → use as-is
    // (`'default'` shorthand lives on the CompileOptions surface and is
    // resolved to DEFAULT_CLIENTS by `resolveTargetClients()` before
    // reaching mergeConfig, so we never see it here.)
    targetClients: overrides.targetClients ?? DEFAULT_CONFIG.targetClients,
    compatibilityMode: overrides.compatibilityMode ?? DEFAULT_CONFIG.compatibilityMode,
    responsive: { ...DEFAULT_CONFIG.responsive, ...overrides.responsive },
    darkMode: { ...DEFAULT_CONFIG.darkMode, ...overrides.darkMode },
    accessibility: { ...DEFAULT_CONFIG.accessibility, ...overrides.accessibility },
    output: { ...DEFAULT_CONFIG.output, ...overrides.output },
    templateEngine: { ...DEFAULT_CONFIG.templateEngine, ...overrides.templateEngine },
    styling: { ...DEFAULT_CONFIG.styling, ...overrides.styling },
  };
}

/**
 * Normalises the `CompileOptions.targetClients` shorthand into a runtime value.
 *
 * - `undefined` → `undefined` (no caniemail-driven gating)
 * - `'default'` → `[...DEFAULT_CLIENTS]` (curated 5-client set)
 * - `string[]`  → the array as-is
 *
 * Pipelines call this once at entry, then operate on the resolved value.
 */
export function resolveTargetClients(
  value: string[] | 'default' | undefined,
): string[] | undefined {
  if (value === 'default') return [...DEFAULT_CLIENTS];
  return value;
}
