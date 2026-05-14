/**
 * Class resolver — maps a single Tailwind-style class name to CSS properties.
 *
 * Resolves typography, color, spacing, sizing, border, display, and
 * alignment utilities using a resolved theme. Handles arbitrary values
 * `[…]`, width fractions, and the `text-` prefix ambiguity (fontSize
 * first, then color).
 *
 * @module css/resolver
 */
import type { CSSProperty, ResolvedTheme, MCIssue } from '../types.js';
import { ErrorCode } from '../errors/codes.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Result of resolving a single class name. */
export interface ResolveClassResult {
  /** Resolved CSS properties (empty array if unknown/rejected). */
  properties: CSSProperty[];
  /** Warning or error for this class (null if clean). */
  issue: MCIssue | null;
}

/**
 * Per-theme memoisation cache.
 *
 * Keyed by the `ResolvedTheme` object reference via `WeakMap` so entries are
 * automatically GC'd when a theme is discarded. When no user theme is
 * configured `resolveTheme()` returns the `DEFAULT_THEME` singleton, meaning
 * the inner `Map` is populated once and reused across every compilation.
 */
const resolveCache = new WeakMap<ResolvedTheme, Map<string, ResolveClassResult>>();

/**
 * Resolves a single Tailwind-style class name to CSS property/value pairs.
 *
 * Results are memoised per theme object so repeated compilations (e.g.
 * live playground) with the same theme pay the lookup cost only once per
 * unique class name.
 *
 * @param className - The class name, e.g. `"bg-brand"`, `"py-4"`, `"text-[#e85d3a]"`.
 * @param theme     - The resolved theme from `resolveTheme()`.
 * @returns A `ResolveClassResult` with properties and optional issue.
 */
export function resolveClass(className: string, theme: ResolvedTheme): ResolveClassResult {
  let themeCache = resolveCache.get(theme);
  if (!themeCache) {
    themeCache = new Map();
    resolveCache.set(theme, themeCache);
  }
  const cached = themeCache.get(className);
  if (cached !== undefined) return cached;

  const result = resolveClassImpl(className, theme);
  themeCache.set(className, result);
  return result;
}

/**
 * Core resolution logic — called at most once per (className, theme) pair.
 *
 * @param className - The class name to resolve.
 * @param theme     - The resolved theme.
 * @returns A `ResolveClassResult` with properties and optional issue.
 */
function resolveClassImpl(className: string, theme: ResolvedTheme): ResolveClassResult {
  // 1a. Silently strip NO_EFFECT utilities (transitions, animations, transforms, cursor).
  //     These produce no CSS and no issue — they are stripped without warning.
  if (matchSilentlyStripped(className)) {
    return { properties: [], issue: null };
  }

  // 1b. Check layout-breaking rejected utilities
  const rejected = REJECTED_UTILITIES[className] ?? matchRejectedPrefix(className);
  if (rejected) {
    return {
      properties: [],
      issue: {
        code: ErrorCode.BREAKING_CSS,
        message: rejected,
        severity: 'error',
      },
    };
  }

  // 2. Try each resolver in order
  const props = resolveUtility(className, theme);
  if (props) {
    return { properties: props, issue: null };
  }

  // 3. Unknown class — try to give a specific hint before the generic message
  return {
    properties: [],
    issue: {
      code: ErrorCode.UNKNOWN_CLASS,
      message: buildUnknownClassMessage(className, theme),
      severity: 'warning',
    },
  };
}

// ---------------------------------------------------------------------------
// Utility resolvers
// ---------------------------------------------------------------------------

/**
 * Builds a helpful unknown-class warning message.
 *
 * For palette names without a shade (e.g. `bg-red`, `text-gray`), lists the
 * available shades so the user knows the correct syntax immediately.
 * Falls back to the generic message for truly unknown classes.
 *
 * @param className - The unresolved class name.
 * @param theme     - The resolved theme.
 * @returns A human-readable warning message.
 */
function buildUnknownClassMessage(className: string, theme: ResolvedTheme): string {
  // Detect "bg-<palette>" and "text-<palette>" without a shade
  const paletteMatch = /^(bg|text)-([a-z]+)$/.exec(className);
  if (paletteMatch) {
    const prefix = paletteMatch[1] as string;
    const name   = paletteMatch[2] as string;
    const entry  = theme.colors[name];
    if (typeof entry === 'object' && entry !== null) {
      const shades = Object.keys(entry).filter((k) => k !== 'DEFAULT');
      if (shades.length > 0) {
        const mid = shades[Math.floor(shades.length / 2)] ?? shades[0];
        return (
          `"${className}" is a color palette, not a single color. ` +
          `Use a shade, e.g. ${prefix}-${name}-${mid}. ` +
          `Available: ${shades.map((s) => `${prefix}-${name}-${s}`).join(', ')}.`
        );
      }
    }
  }

  return `Unknown class "${className}". Check spelling or add it to your theme.`;
}

/**
 * Attempts to resolve a class name to CSS properties.
 * Returns `null` if the class is not recognized.
 */
function resolveUtility(cls: string, theme: ResolvedTheme): CSSProperty[] | null {
  return (
    resolveTextUtility(cls, theme) ??
    resolveBgUtility(cls, theme) ??
    resolveFontUtility(cls, theme) ??
    resolveSpacingUtility(cls, theme) ??
    resolveSizingUtility(cls, theme) ??
    resolveBorderUtility(cls, theme) ??
    resolveDisplayUtility(cls) ??
    resolveAlignUtility(cls) ??
    resolveTextDecorationUtility(cls) ??
    resolveTextTransformUtility(cls) ??
    resolveWhitespaceUtility(cls) ??
    resolveLeadingUtility(cls, theme) ??
    resolveTrackingUtility(cls, theme) ??
    resolveItalicUtility(cls) ??
    resolveShadowUtility(cls) ??
    resolveOpacityUtility(cls) ??
    resolveListUtility(cls) ??
    null
  );
}

// ---------------------------------------------------------------------------
// List utilities (list-disc / list-decimal / list-inside / etc.)
// ---------------------------------------------------------------------------

const LIST_STYLE_TYPE_MAP: Record<string, string> = {
  'list-disc': 'disc',
  'list-circle': 'circle',
  'list-square': 'square',
  'list-decimal': 'decimal',
  'list-lower-alpha': 'lower-alpha',
  'list-upper-alpha': 'upper-alpha',
  'list-lower-roman': 'lower-roman',
  'list-upper-roman': 'upper-roman',
  'list-none': 'none',
};

const LIST_STYLE_POSITION_MAP: Record<string, string> = {
  'list-inside': 'inside',
  'list-outside': 'outside',
};

/** Resolves list-style utilities (list-disc, list-decimal, list-inside, etc.). */
function resolveListUtility(cls: string): CSSProperty[] | null {
  const ty = LIST_STYLE_TYPE_MAP[cls];
  if (ty) return [{ property: 'list-style-type', value: ty }];
  const pos = LIST_STYLE_POSITION_MAP[cls];
  if (pos) return [{ property: 'list-style-position', value: pos }];
  return null;
}

// ---------------------------------------------------------------------------
// text- (ambiguous: fontSize OR color)
// ---------------------------------------------------------------------------

/** Resolves `text-*` classes. fontSize takes priority over color (per Doc 03). */
function resolveTextUtility(cls: string, theme: ResolvedTheme): CSSProperty[] | null {
  if (!cls.startsWith('text-')) return null;
  const value = cls.slice(5); // strip "text-"

  // Alignment shortcuts (text-left, text-center, text-right, text-justify)
  const alignments: Record<string, string> = {
    left: 'left', center: 'center', right: 'right', justify: 'justify',
  };
  if (alignments[value]) {
    return [{ property: 'text-align', value: alignments[value] as string }];
  }

  // Arbitrary value: text-[#e85d3a] or text-[22px]
  const arb = extractArbitrary(value);
  if (arb !== null) {
    if (isColorValue(arb)) {
      return [{ property: 'color', value: arb }];
    }
    return [{ property: 'font-size', value: arb }];
  }

  // fontSize first (e.g. text-lg, text-base, text-2xl)
  const fontSize = theme.fontSize[value];
  if (fontSize) {
    if (typeof fontSize === 'string') {
      return [{ property: 'font-size', value: fontSize }];
    }
    // Tuple: [size, { lineHeight, ... }]
    const props: CSSProperty[] = [{ property: 'font-size', value: fontSize[0] }];
    if (fontSize[1]?.lineHeight) {
      props.push({ property: 'line-height', value: fontSize[1].lineHeight });
    }
    return props;
  }

  // Color (e.g. text-red-500, text-brand, text-brand-dark)
  const color = resolveColor(value, theme);
  if (color) {
    return [{ property: 'color', value: color }];
  }

  return null;
}

// ---------------------------------------------------------------------------
// bg-
// ---------------------------------------------------------------------------

/** Resolves `bg-*` color classes. */
function resolveBgUtility(cls: string, theme: ResolvedTheme): CSSProperty[] | null {
  if (!cls.startsWith('bg-')) return null;
  const value = cls.slice(3);

  const arb = extractArbitrary(value);
  if (arb !== null) {
    return [{ property: 'background-color', value: arb }];
  }

  const color = resolveColor(value, theme);
  if (color) {
    return [{ property: 'background-color', value: color }];
  }

  return null;
}

// ---------------------------------------------------------------------------
// font-
// ---------------------------------------------------------------------------

/** Resolves `font-*` classes (family and weight). */
function resolveFontUtility(cls: string, theme: ResolvedTheme): CSSProperty[] | null {
  if (!cls.startsWith('font-')) return null;
  const value = cls.slice(5);

  // Weight (e.g. font-bold, font-semibold)
  const weight = theme.fontWeight[value];
  if (weight) {
    return [{ property: 'font-weight', value: weight }];
  }

  // Family (e.g. font-sans, font-serif, font-mono)
  const family = theme.fontFamily[value];
  if (family) {
    return [{ property: 'font-family', value: family.join(', ') }];
  }

  return null;
}

// ---------------------------------------------------------------------------
// leading- (line-height)
// ---------------------------------------------------------------------------

/** Resolves `leading-*` classes. */
function resolveLeadingUtility(cls: string, theme: ResolvedTheme): CSSProperty[] | null {
  if (!cls.startsWith('leading-')) return null;
  const value = cls.slice(8);

  const arb = extractArbitrary(value);
  if (arb !== null) {
    return [{ property: 'line-height', value: arb }];
  }

  const lh = theme.lineHeight[value];
  if (lh) {
    return [{ property: 'line-height', value: lh }];
  }

  return null;
}

// ---------------------------------------------------------------------------
// tracking- (letter-spacing)
// ---------------------------------------------------------------------------

/** Resolves `tracking-*` classes. */
function resolveTrackingUtility(cls: string, theme: ResolvedTheme): CSSProperty[] | null {
  if (!cls.startsWith('tracking-')) return null;
  const value = cls.slice(9);

  const arb = extractArbitrary(value);
  if (arb !== null) {
    return [{ property: 'letter-spacing', value: arb }];
  }

  const ls = theme.letterSpacing[value];
  if (ls) {
    return [{ property: 'letter-spacing', value: ls }];
  }

  return null;
}

// ---------------------------------------------------------------------------
// Spacing: p-*, m-*
// ---------------------------------------------------------------------------

/**
 * Spacing map — every prefix resolves directly to longhands.
 *
 * Shorthands (`padding`, `margin`) are intentionally absent. Emitting
 * longhands at resolve-time means later classes can safely overwrite
 * individual sides without order-sensitivity bugs (e.g. `m-3 mt-6` and
 * `mt-6 m-3` both produce the same correct result).
 */
const SPACING_MAP: Record<string, string[]> = {
  'p':  ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  'px': ['padding-left', 'padding-right'],
  'py': ['padding-top', 'padding-bottom'],
  'pt': ['padding-top'],
  'pr': ['padding-right'],
  'pb': ['padding-bottom'],
  'pl': ['padding-left'],
  'm':  ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  'mx': ['margin-left', 'margin-right'],
  'my': ['margin-top', 'margin-bottom'],
  'mt': ['margin-top'],
  'mr': ['margin-right'],
  'mb': ['margin-bottom'],
  'ml': ['margin-left'],
};

/** Resolves padding and margin classes. */
function resolveSpacingUtility(cls: string, theme: ResolvedTheme): CSSProperty[] | null {
  // Match prefix-value, e.g. "py-4", "m-auto", "px-[20px]"
  const match = /^(p[xylrtb]?|m[xylrtb]?)-(.+)$/.exec(cls);
  if (!match) return null;

  const prefix = match[1] as string;
  const value = match[2] as string;
  const cssProps = SPACING_MAP[prefix];
  if (!cssProps) return null;

  // Single-side utilities (1 prop) get higher specificity than all-sides (4 props).
  const specificity = cssProps.length === 1 ? 1 : 0;

  const arb = extractArbitrary(value);
  if (arb !== null) {
    return cssProps.map(p => ({ property: p, value: arb, specificity }));
  }

  // Special: m-auto
  if (value === 'auto' && prefix.startsWith('m')) {
    return cssProps.map(p => ({ property: p, value: 'auto', specificity }));
  }

  const resolved = theme.spacing[value];
  if (!resolved) return null;

  return cssProps.map(p => ({ property: p, value: resolved, specificity }));
}

// ---------------------------------------------------------------------------
// Sizing: w-*, h-*, max-w-*, min-h-*
// ---------------------------------------------------------------------------

/** Resolves width, height, max-width, min-height classes. */
function resolveSizingUtility(cls: string, theme: ResolvedTheme): CSSProperty[] | null {
  // w-* (including fractions like w-1/2)
  if (cls.startsWith('w-')) {
    const value = cls.slice(2);
    return resolveSingleSize('width', value, theme.width, theme.spacing);
  }

  // h-*
  if (cls.startsWith('h-')) {
    const value = cls.slice(2);
    return resolveSingleSize('height', value, theme.height, theme.spacing);
  }

  // max-w-*
  if (cls.startsWith('max-w-')) {
    const value = cls.slice(6);
    return resolveSingleSize('max-width', value, theme.maxWidth, theme.spacing);
  }

  // min-h-*
  if (cls.startsWith('min-h-')) {
    const value = cls.slice(6);
    const arb = extractArbitrary(value);
    if (arb !== null) return [{ property: 'min-height', value: arb }];
    const resolved = theme.spacing[value];
    if (resolved) return [{ property: 'min-height', value: resolved }];
    return null;
  }

  return null;
}

/** Resolves a single sizing property from its scale + spacing fallback. */
function resolveSingleSize(
  prop: string,
  value: string,
  scale: Record<string, string>,
  spacing: Record<string, string>,
): CSSProperty[] | null {
  const arb = extractArbitrary(value);
  if (arb !== null) return [{ property: prop, value: arb }];

  // Named scale value (e.g. "full", "1/2", "auto", "email")
  const scaleVal = scale[value];
  if (scaleVal) return [{ property: prop, value: scaleVal }];

  // Spacing scale fallback (e.g. w-4 → 16px)
  const spacingVal = spacing[value];
  if (spacingVal) return [{ property: prop, value: spacingVal }];

  return null;
}

// ---------------------------------------------------------------------------
// Border: border-*, rounded-*
// ---------------------------------------------------------------------------

/** Resolves border and border-radius classes. */
function resolveBorderUtility(cls: string, theme: ResolvedTheme): CSSProperty[] | null {
  // rounded-* (border-radius)
  if (cls === 'rounded') {
    return [{ property: 'border-radius', value: theme.borderRadius['DEFAULT'] ?? '4px' }];
  }
  if (cls.startsWith('rounded-')) {
    const value = cls.slice(8);
    const arb = extractArbitrary(value);
    if (arb !== null) return [{ property: 'border-radius', value: arb }];
    const resolved = theme.borderRadius[value];
    if (resolved) return [{ property: 'border-radius', value: resolved }];
    return null;
  }

  // border-style
  const styles: Record<string, string> = {
    'border-solid': 'solid',
    'border-dashed': 'dashed',
    'border-dotted': 'dotted',
    'border-none': 'none',
  };
  if (styles[cls]) {
    return [{ property: 'border-style', value: styles[cls] as string }];
  }

  // border (bare = 1px)
  if (cls === 'border') {
    return [{ property: 'border-width', value: theme.borderWidth['DEFAULT'] ?? '1px' }];
  }

  // border-{side}-{n} (e.g. border-t-2)
  const sideMatch = /^border-([trbl])-(\d+)$/.exec(cls);
  if (sideMatch) {
    const sideMap: Record<string, string> = { t: 'top', r: 'right', b: 'bottom', l: 'left' };
    const side = sideMap[sideMatch[1] as string] as string;
    const width = theme.borderWidth[sideMatch[2] as string];
    if (width) return [{ property: `border-${side}-width`, value: width }];
    return null;
  }

  // border-{side} (e.g. border-t = 1px)
  const bareSideMatch = /^border-([trbl])$/.exec(cls);
  if (bareSideMatch) {
    const sideMap: Record<string, string> = { t: 'top', r: 'right', b: 'bottom', l: 'left' };
    const side = sideMap[bareSideMatch[1] as string] as string;
    return [{ property: `border-${side}-width`, value: theme.borderWidth['DEFAULT'] ?? '1px' }];
  }

  // border-{n} (width, e.g. border-2, border-4)
  const widthMatch = /^border-(\d+)$/.exec(cls);
  if (widthMatch) {
    const width = theme.borderWidth[widthMatch[1] as string];
    if (width) return [{ property: 'border-width', value: width }];
    return null;
  }

  // border-{color} (e.g. border-red-500, border-brand)
  if (cls.startsWith('border-')) {
    const value = cls.slice(7);
    const arb = extractArbitrary(value);
    if (arb !== null) return [{ property: 'border-color', value: arb }];
    const color = resolveColor(value, theme);
    if (color) return [{ property: 'border-color', value: color }];
  }

  return null;
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** Module-level constant — avoids re-creating the object on every call. */
const DISPLAY_MAP: Record<string, string> = {
  block: 'block',
  inline: 'inline',
  'inline-block': 'inline-block',
  hidden: 'none',
};

/** Resolves display classes. */
function resolveDisplayUtility(cls: string): CSSProperty[] | null {
  const val = DISPLAY_MAP[cls];
  if (val) return [{ property: 'display', value: val }];
  return null;
}

// ---------------------------------------------------------------------------
// Vertical align
// ---------------------------------------------------------------------------

/** Valid vertical-align values. */
const VALID_ALIGN = new Set(['top', 'middle', 'bottom', 'baseline']);

/** Resolves `align-*` vertical alignment classes. */
function resolveAlignUtility(cls: string): CSSProperty[] | null {
  if (!cls.startsWith('align-')) return null;
  const value = cls.slice(6);
  if (VALID_ALIGN.has(value)) {
    return [{ property: 'vertical-align', value }];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Text decoration
// ---------------------------------------------------------------------------

/** Module-level constant — avoids re-creating the object on every call. */
const TEXT_DECORATION_MAP: Record<string, string> = {
  underline: 'underline',
  'no-underline': 'none',
  'line-through': 'line-through',
};

/** Resolves text-decoration classes. */
function resolveTextDecorationUtility(cls: string): CSSProperty[] | null {
  const val = TEXT_DECORATION_MAP[cls];
  if (val) return [{ property: 'text-decoration', value: val }];
  return null;
}

// ---------------------------------------------------------------------------
// Text transform
// ---------------------------------------------------------------------------

/** Module-level constant — avoids re-creating the object on every call. */
const TEXT_TRANSFORM_MAP: Record<string, string> = {
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
  'normal-case': 'none',
};

/** Resolves text-transform classes. */
function resolveTextTransformUtility(cls: string): CSSProperty[] | null {
  const val = TEXT_TRANSFORM_MAP[cls];
  if (val) return [{ property: 'text-transform', value: val }];
  return null;
}

// ---------------------------------------------------------------------------
// Font style (italic / not-italic)
// ---------------------------------------------------------------------------

/** Resolves italic / not-italic classes. */
function resolveItalicUtility(cls: string): CSSProperty[] | null {
  if (cls === 'italic') return [{ property: 'font-style', value: 'italic' }];
  if (cls === 'not-italic') return [{ property: 'font-style', value: 'normal' }];
  return null;
}

// ---------------------------------------------------------------------------
// Whitespace / word-break
// ---------------------------------------------------------------------------

/** Module-level constant — avoids re-creating the object on every call. */
const WHITESPACE_MAP: Record<string, string> = {
  'whitespace-normal': 'normal',
  'whitespace-nowrap': 'nowrap',
  'whitespace-pre': 'pre',
  'whitespace-pre-line': 'pre-line',
  'whitespace-pre-wrap': 'pre-wrap',
};

/** Resolves whitespace and word-break classes. */
function resolveWhitespaceUtility(cls: string): CSSProperty[] | null {
  const wsVal = WHITESPACE_MAP[cls];
  if (wsVal) {
    return [{ property: 'white-space', value: wsVal }];
  }

  if (cls === 'break-words') return [{ property: 'word-break', value: 'break-word' }];
  if (cls === 'break-all') return [{ property: 'word-break', value: 'break-all' }];

  return null;
}

// ---------------------------------------------------------------------------
// Color resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a color name from the theme. Handles:
 * - Flat colors: `"white"` → `#ffffff`
 * - Nested: `"red-500"` → `colors.red['500']`
 * - Nested DEFAULT: `"brand"` → `colors.brand.DEFAULT`
 *
 * @param name  - Color name like `"red-500"`, `"brand"`, `"white"`.
 * @param theme - The resolved theme.
 * @returns The resolved color string or `null`.
 */
export function resolveColor(name: string, theme: ResolvedTheme): string | null {
  const colors = theme.colors;

  // Direct flat match (e.g. "white", "transparent")
  const direct = colors[name];
  if (typeof direct === 'string') return direct;

  // Nested lookup: split on last dash — e.g. "red-500" → group="red", shade="500"
  const dashIdx = name.lastIndexOf('-');
  if (dashIdx > 0) {
    const group = name.slice(0, dashIdx);
    const shade = name.slice(dashIdx + 1);
    const nested = colors[group];
    if (typeof nested === 'object' && nested[shade]) {
      return nested[shade] as string;
    }
  }

  // DEFAULT lookup: e.g. "brand" → colors.brand.DEFAULT
  if (typeof direct === 'object' && direct['DEFAULT']) {
    return direct['DEFAULT'];
  }

  return null;
}

// ---------------------------------------------------------------------------
// Arbitrary value extraction
// ---------------------------------------------------------------------------

/**
 * Extracts an arbitrary value from `[…]` syntax.
 * Returns `null` if the value doesn't use arbitrary syntax.
 *
 * @example extractArbitrary("[#e85d3a]") → "#e85d3a"
 * @example extractArbitrary("[20px]") → "20px"
 * @example extractArbitrary("4") → null
 */
function extractArbitrary(value: string): string | null {
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1);
  }
  return null;
}

/** Checks whether a string looks like a CSS color value. */
function isColorValue(value: string): boolean {
  return (
    value.startsWith('#') ||
    value.startsWith('rgb') ||
    value.startsWith('hsl') ||
    value === 'transparent' ||
    value === 'currentColor'
  );
}

// ---------------------------------------------------------------------------
// shadow-* → box-shadow (ENHANCE: partial email client support)
// ---------------------------------------------------------------------------

/**
 * Named Tailwind shadow values.
 * These match the Tailwind v3 default shadow scale.
 * The classifier will classify box-shadow as ENHANCE for default targetClients
 * (Gmail + Outlook don't support box-shadow; Apple Mail + iOS do).
 */
const SHADOW_VALUES: Record<string, string> = {
  'shadow-sm':    '0 1px 2px 0 rgba(0,0,0,0.05)',
  'shadow':       '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
  'shadow-md':    '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  'shadow-lg':    '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
  'shadow-xl':    '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  'shadow-2xl':   '0 25px 50px -12px rgba(0,0,0,0.25)',
  'shadow-inner': 'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
  'shadow-none':  '0 0 #0000',
};

/** Resolves shadow-* classes to box-shadow CSS property. */
function resolveShadowUtility(cls: string): CSSProperty[] | null {
  // Named shadow: shadow-sm, shadow, shadow-md, ... shadow-2xl, shadow-inner, shadow-none
  const named = SHADOW_VALUES[cls];
  if (named !== undefined) {
    return [{ property: 'box-shadow', value: named }];
  }

  // Arbitrary value: shadow-[0_4px_8px_rgba(0,0,0,0.3)]
  if (cls.startsWith('shadow-[') && cls.endsWith(']')) {
    const value = cls.slice(8, -1).replace(/_/g, ' ');
    return [{ property: 'box-shadow', value }];
  }

  return null;
}

// ---------------------------------------------------------------------------
// opacity-* → opacity (ENHANCE: partial email client support)
// ---------------------------------------------------------------------------

/**
 * Named Tailwind opacity scale values.
 * Tailwind v3 default opacity scale: 0, 5, 10, 15, 20, 25, 30, 35, 40, 45,
 * 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100.
 */
const OPACITY_SCALE: Record<string, string> = {
  '0':   '0',
  '5':   '0.05',
  '10':  '0.1',
  '15':  '0.15',
  '20':  '0.2',
  '25':  '0.25',
  '30':  '0.3',
  '35':  '0.35',
  '40':  '0.4',
  '45':  '0.45',
  '50':  '0.5',
  '55':  '0.55',
  '60':  '0.6',
  '65':  '0.65',
  '70':  '0.7',
  '75':  '0.75',
  '80':  '0.8',
  '85':  '0.85',
  '90':  '0.9',
  '95':  '0.95',
  '100': '1',
};

/** Resolves opacity-* classes to opacity CSS property. */
function resolveOpacityUtility(cls: string): CSSProperty[] | null {
  if (!cls.startsWith('opacity-')) return null;
  const value = cls.slice(8); // strip 'opacity-'

  // Arbitrary value: opacity-[0.85]
  const arb = extractArbitrary(value);
  if (arb !== null) {
    return [{ property: 'opacity', value: arb }];
  }

  // Named scale: opacity-0, opacity-50, opacity-100, etc.
  const scaled = OPACITY_SCALE[value];
  if (scaled !== undefined) {
    return [{ property: 'opacity', value: scaled }];
  }

  return null;
}

// ---------------------------------------------------------------------------
// Rejected utilities
// ---------------------------------------------------------------------------

/** Utilities that are completely unsupported in email. */
const REJECTED_UTILITIES: Record<string, string> = {
  flex: 'flex is not supported in email. Use mc-section + mc-column for layout.',
  'inline-flex': 'flex is not supported in email. Use mc-section + mc-column for layout.',
  grid: 'grid is not supported in email. Use mc-section + mc-column for layout.',
  'inline-grid': 'grid is not supported in email. Use mc-section + mc-column for layout.',
  absolute: 'Positioning is not supported in email clients.',
  relative: 'Positioning is not supported in email clients.',
  fixed: 'Positioning is not supported in email clients.',
  sticky: 'Positioning is not supported in email clients.',
};

/**
 * Prefixes for NO_EFFECT utilities — silently stripped with no issue emitted.
 *
 * These resolve to CSS properties that email clients simply ignore (animations,
 * transitions, transforms, cursor). In liberal mode, stripping them silently is
 * the right behavior — no noise for developers who include them by habit.
 */
const SILENTLY_STRIPPED_PREFIXES: string[] = [
  'transition-',
  'animate-',
  'transform',  // matches bare "transform" and "transform-*"
  'rotate-',
  'scale-',
  'cursor-',
];

/** Prefixes for utilities that are layout-breaking in email. */
const REJECTED_PREFIXES: [string, string][] = [
  ['items-', 'Requires flex/grid. Use mc-column with vertical-align instead.'],
  ['justify-', 'Requires flex/grid. Use mc-column with text-align instead.'],
  ['float-', 'Float is not supported in email. Use mc-column for layout.'],
  ['z-', 'z-index has no effect in email clients.'],
  ['overflow-', 'Overflow is not reliable in email clients.'],
];

/**
 * Precomputed entries: [prefix, bareWord, message].
 * `bareWord` = prefix with trailing `-` stripped (precomputed once at module
 * init instead of calling `prefix.replace(/-$/, '')` on every invocation).
 */
const REJECTED_PREFIX_ENTRIES: [prefix: string, bare: string, message: string][] =
  REJECTED_PREFIXES.map(([prefix, message]) => [prefix, prefix.replace(/-$/, ''), message]);

/** Checks silently-stripped prefixes. Returns true if the class should be dropped quietly. */
function matchSilentlyStripped(cls: string): boolean {
  for (const prefix of SILENTLY_STRIPPED_PREFIXES) {
    const bare = prefix.replace(/-$/, '');
    if (cls.startsWith(prefix) || cls === bare) {
      return true;
    }
  }
  return false;
}

/** Checks rejected prefixes. Returns the error message or null. */
function matchRejectedPrefix(cls: string): string | null {
  for (const [prefix, bare, message] of REJECTED_PREFIX_ENTRIES) {
    if (cls.startsWith(prefix) || cls === bare) {
      return message;
    }
  }
  return null;
}
