/**
 * CSS inliner — converts resolved CSS classes into inline styles and style blocks.
 *
 * Takes Tailwind-style class names, resolves them through the theme,
 * expands shorthands, classifies each property, and produces:
 *
 * 1. **Inline styles** — SAFE properties as a `style="..."` string.
 * 2. **Style block CSS** — ENHANCE properties for a `<style>` element.
 * 3. **Warnings** — BREAKING and NO_EFFECT properties stripped with warnings.
 *
 * @module css/inliner
 */
import type {
  CSSProperty,
  MCIssue,
  ResolvedTheme,
  ClassifiedCSS,
  ClassificationMap,
  CompatibilityMode,
} from '../types.js';
import { ErrorCode } from '../errors/codes.js';
import { deduplicateBySpecificity, serializeToInlineStyle } from '../utils/specificity-dedup.js';
import { resolveClass } from './resolver.js';
import { expandAllShorthands } from './shorthand.js';
import { classifyProperties, filterByClassification } from './classifier.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Result of inlining CSS for a single element. */
export interface InlineResult {
  /** CSS declarations for the `style` attribute, e.g. `"color:#fff;font-size:16px"`. */
  inlineStyle: string;
  /** Warnings and info messages for stripped/partial properties. */
  warnings: MCIssue[];
  /**
   * Maps CSS property name → Tailwind class name that produced it.
   * Only includes properties that survived into `inlineStyle`.
   */
  classOrigins: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Processes a `class` attribute string into inline styles and style block CSS.
 *
 * Steps:
 * 1. Split class string into individual class names.
 * 2. Resolve each class to CSS properties via theme.
 * 3. Separate `sm:` prefixed classes for media query handling.
 * 4. Expand shorthands to longhands.
 * 5. Classify each property (SAFE / ENHANCE / BREAKING / NO_EFFECT).
 * 6. Build inline style string from SAFE properties.
 * 7. Collect ENHANCE properties for `<style>` block.
 * 8. Emit warnings for BREAKING / NO_EFFECT.
 *
 * @param classAttr  - The `class` attribute string, e.g. `"bg-brand text-white rounded"`.
 * @param theme      - Resolved theme from `resolveTheme()`.
 * @param attributes - Element attributes (for precedence — attribute values win).
 * @returns The inline result with styles, enhance CSS, and warnings.
 */
export function inlineCSS(
  classAttr: string,
  theme: ResolvedTheme,
  attributes: Record<string, string> = {},
  classificationMap?: ClassificationMap,
  mode: CompatibilityMode = 'liberal',
): InlineResult {
  const warnings: MCIssue[] = [];
  const allProps: CSSProperty[] = [];
  // Tracks which Tailwind class produced each CSS property (property name → class name).
  // Built during class resolution, pruned after attribute precedence filtering.
  const rawClassOrigins = new Map<string, string>();

  // 1. Split and separate sm: classes
  const classes = splitClasses(classAttr, warnings);
  const { desktop, responsive } = separateResponsive(classes);

  // 2. Warn about sm: classes without desktop fallback (handled by media-queries module)
  if (responsive.length > 0) {
    warnResponsiveWithoutDesktop(desktop, responsive, warnings);
  }

  // 3. Resolve desktop classes to CSS properties
  for (const cls of desktop) {
    const result = resolveClass(cls, theme);
    if (result.issue) {
      warnings.push(result.issue);
    }
    for (const prop of result.properties) {
      allProps.push(prop);
      // Track origin: last class to set a property wins (matches dedup order)
      rawClassOrigins.set(prop.property, cls);
    }
  }

  // 4. Expand shorthands
  const expanded = expandAllShorthands(allProps);
  // Propagate origins through shorthand expansion: expanded longhands inherit the
  // parent shorthand's class origin if we don't already know their origin.
  for (const prop of expanded) {
    if (!rawClassOrigins.has(prop.property)) {
      // Find which class owns the shorthand that expanded into this longhand
      // by checking if the shorthand name is tracked (best effort).
      const shorthandMatch = [...rawClassOrigins.entries()].find(([, cls]) => {
        // The class likely contains the shorthand (e.g. `p-4` → padding longhands)
        return cls.length > 0 && !rawClassOrigins.has(prop.property);
      });
      if (shorthandMatch) {
        rawClassOrigins.set(prop.property, shorthandMatch[1]);
      }
    }
  }

  // 5. Apply attribute precedence — attributes win over class
  const filtered = applyAttributePrecedence(expanded, attributes);

  // 6. Classify
  const classified = classifyProperties(filtered, classificationMap);

  // 7. Build results
  const safe = filterByClassification(classified, 'SAFE');
  const enhance = filterByClassification(classified, 'ENHANCE');
  const breaking = filterByClassification(classified, 'BREAKING');
  const noEffect = filterByClassification(classified, 'NO_EFFECT');

  // 8. Emit warnings for BREAKING and NO_EFFECT
  emitBreakingWarnings(breaking, warnings);
  emitNoEffectWarnings(noEffect, warnings);

  // 9. Mode determines ENHANCE fate:
  //    - strict:  strip ENHANCE and warn — output is identical across all target clients.
  //    - liberal: inline ENHANCE alongside SAFE — client renders it or silently ignores it.
  //               Gmail strips <style> blocks but respects inline styles, so inlining is
  //               strictly better than the old style-block approach.
  if (mode === 'strict') {
    emitEnhanceStrippedWarnings(enhance, warnings);
  }

  const outputProps = mode === 'strict' ? safe : [...safe, ...enhance];

  // Build classOrigins for surviving properties only
  const survivingProps = new Set(outputProps.map((c) => c.property.property));
  const classOrigins: Record<string, string> = {};
  for (const [prop, cls] of rawClassOrigins) {
    if (survivingProps.has(prop)) {
      classOrigins[prop] = cls;
    }
  }

  return {
    inlineStyle: buildInlineStyle(outputProps),
    warnings,
    classOrigins,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Splits a class attribute string into individual class names.
 * Detects `!`-prefixed classes (e.g. `!m-5`), emits a warning for each,
 * and strips the `!` — `!important` is not supported and has no effect
 * inside inline `style=""` attributes.
 *
 * @param classAttr - Space-separated class string.
 * @param warnings  - Warning accumulator.
 * @returns Sanitised array of class names with `!` prefixes removed.
 */
function splitClasses(classAttr: string, warnings: MCIssue[]): string[] {
  return classAttr.trim().split(/\s+/).filter(Boolean).map((cls) => {
    if (!cls.startsWith('!')) return cls;
    const stripped = cls.slice(1);
    warnings.push({
      code: ErrorCode.IMPORTANT_NOT_SUPPORTED,
      message: `"${cls}" uses !important which is not supported. ` +
        `Inline styles already have the highest specificity — '${stripped}' will be used instead.`,
      severity: 'warning',
    });
    return stripped;
  });
}

/** Separated desktop and responsive classes. */
interface SeparatedClasses {
  desktop: string[];
  responsive: string[];
}

/**
 * Separates `sm:` prefixed classes from desktop classes.
 *
 * @param classes - Array of class names.
 * @returns Separated desktop and responsive arrays.
 */
function separateResponsive(classes: string[]): SeparatedClasses {
  const desktop: string[] = [];
  const responsive: string[] = [];

  for (const cls of classes) {
    if (cls.startsWith('sm:')) {
      responsive.push(cls);
    } else {
      desktop.push(cls);
    }
  }

  return { desktop, responsive };
}

/** Maps CSS property prefix to HTML attribute name. */
const ATTRIBUTE_TO_CSS_MAP: Record<string, string[]> = {
  width: ['width'],
  height: ['height'],
  align: ['text-align'],
  valign: ['vertical-align'],
  bgcolor: ['background-color'],
};

/**
 * Removes CSS properties that conflict with HTML attributes.
 * HTML attributes take precedence over class-resolved CSS.
 *
 * @param props      - Expanded CSS properties.
 * @param attributes - Element attributes.
 * @returns Filtered properties with attribute-covered ones removed.
 */
function applyAttributePrecedence(
  props: CSSProperty[],
  attributes: Record<string, string>,
): CSSProperty[] {
  const coveredProps = new Set<string>();

  for (const [attr, cssProps] of Object.entries(ATTRIBUTE_TO_CSS_MAP)) {
    if (attr in attributes) {
      for (const cssProp of cssProps) {
        coveredProps.add(cssProp);
      }
    }
  }

  if (coveredProps.size === 0) {
    return props;
  }

  return props.filter((p) => !coveredProps.has(p.property));
}

/**
 * Builds an inline style string from SAFE classified properties.
 * Delegates to `deduplicateBySpecificity` + `serializeToInlineStyle`.
 *
 * @param safe - SAFE classified CSS properties.
 * @returns Style string, e.g. `"color:#fff;font-size:16px"`.
 */
function buildInlineStyle(safe: ClassifiedCSS[]): string {
  const raw = safe.map(c => c.property);
  const deduped = deduplicateBySpecificity(raw);
  return serializeToInlineStyle(deduped);
}

/**
 * Emits warnings for BREAKING properties that were stripped.
 *
 * @param breaking - BREAKING classified properties.
 * @param warnings - Warning accumulator.
 */
function emitBreakingWarnings(breaking: ClassifiedCSS[], warnings: MCIssue[]): void {
  for (const item of breaking) {
    warnings.push({
      code: ErrorCode.BREAKING_CSS,
      message:
        `"${item.property.property}: ${item.property.value}" breaks layout in major email clients and has been stripped.`,
      severity: 'error',
    });
  }
}

/**
 * Emits warnings for ENHANCE properties stripped in strict mode.
 *
 * Each warning names the CSS property that was stripped and advises that
 * strict mode requires all declared `targetClients` to support it.
 *
 * @param enhance  - ENHANCE classified properties.
 * @param warnings - Warning accumulator.
 */
function emitEnhanceStrippedWarnings(enhance: ClassifiedCSS[], warnings: MCIssue[]): void {
  for (const item of enhance) {
    warnings.push({
      code: ErrorCode.ENHANCE_PROPERTY_STRIPPED,
      message:
        `"${item.property.property}" is not supported by all target clients and has been stripped (compatibilityMode: 'strict'). ` +
        `Switch to compatibilityMode: 'liberal' to allow graceful degradation instead.`,
      severity: 'warning',
    });
  }
}

/**
 * Emits warnings for NO_EFFECT properties that were stripped.
 *
 * @param noEffect - NO_EFFECT classified properties.
 * @param warnings - Warning accumulator.
 */
function emitNoEffectWarnings(noEffect: ClassifiedCSS[], warnings: MCIssue[]): void {
  for (const item of noEffect) {
    warnings.push({
      code: ErrorCode.NO_EFFECT_CSS,
      message:
        `"${item.property.property}: ${item.property.value}" has no effect in email clients and has been stripped.`,
      severity: 'info',
    });
  }
}

/**
 * Warns when `sm:` classes lack a corresponding desktop fallback.
 *
 * @param desktop    - Desktop class names.
 * @param responsive - Responsive (`sm:`) class names.
 * @param warnings   - Warning accumulator.
 */
function warnResponsiveWithoutDesktop(
  desktop: string[],
  responsive: string[],
  warnings: MCIssue[],
): void {
  // Extract the utility prefix from desktop classes (e.g. "text-" from "text-lg")
  const desktopPrefixes = new Set<string>();
  for (const cls of desktop) {
    const prefix = extractUtilityPrefix(cls);
    if (prefix) {
      desktopPrefixes.add(prefix);
    }
  }

  for (const cls of responsive) {
    const utility = cls.slice(3); // remove "sm:"
    const prefix = extractUtilityPrefix(utility);
    if (prefix && !desktopPrefixes.has(prefix)) {
      warnings.push({
        code: ErrorCode.NO_DESKTOP_FALLBACK,
        message:
          `"${cls}" has no desktop fallback. Clients without @media support (~40%) will use inherited styles. Add a non-prefixed "${prefix}*" class.`,
        severity: 'warning',
      });
    }
  }
}

/**
 * Extracts the utility prefix from a class name.
 * E.g. `"text-lg"` → `"text-"`, `"bg-red-500"` → `"bg-"`.
 *
 * @param cls - The class name.
 * @returns The prefix or empty string.
 */
function extractUtilityPrefix(cls: string): string {
  const dashIdx = cls.indexOf('-');
  if (dashIdx === -1) {
    return cls;
  }
  return cls.slice(0, dashIdx + 1);
}
