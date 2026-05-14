/**
 * Media query generator — converts `sm:` prefixed classes to `@media` blocks.
 *
 * Takes responsive class names (e.g. `sm:text-base`, `sm:px-4`), resolves
 * them through the theme, and generates a `@media` block with `!important`
 * overrides. Only SAFE and ENHANCE properties are included; BREAKING and
 * NO_EFFECT are stripped with warnings.
 *
 * @module css/media-queries
 */
import type { MCIssue, ResolvedTheme, ClassificationMap } from '../types.js';
import { resolveClass } from './resolver.js';
import { expandAllShorthands } from './shorthand.js';
import { classifyProperties, filterByClassification } from './classifier.js';
import { ErrorCode } from '../errors/codes.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A resolved responsive rule for one element. */
export interface ResponsiveRule {
  /** The generated class name, e.g. `"sm-text-base"`. */
  className: string;
  /** CSS declarations with `!important`. */
  declarations: string;
}

/** Result of processing responsive classes for a compilation. */
export interface MediaQueryResult {
  /** The complete `@media` block string, or empty if no rules. */
  mediaBlock: string;
  /** Individual responsive rules (for assembling into the block). */
  rules: ResponsiveRule[];
  /** Warnings from stripped BREAKING/NO_EFFECT classes. */
  warnings: MCIssue[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Processes `sm:` prefixed classes for a single element.
 *
 * Resolves each responsive class, classifies properties, and produces
 * a CSS class name + declarations pair for the `@media` block.
 *
 * @param responsiveClasses - Array of `sm:` prefixed class names.
 * @param theme             - Resolved theme.
 * @returns Array of responsive rules and warnings.
 */
export function resolveResponsiveClasses(
  responsiveClasses: string[],
  theme: ResolvedTheme,
  classificationMap?: ClassificationMap,
): { rules: ResponsiveRule[]; warnings: MCIssue[] } {
  const rules: ResponsiveRule[] = [];
  const warnings: MCIssue[] = [];

  for (const cls of responsiveClasses) {
    const utility = cls.slice(3); // remove "sm:"
    const result = resolveClass(utility, theme);

    if (result.issue) {
      warnings.push(result.issue);
      continue;
    }

    if (result.properties.length === 0) {
      continue;
    }

    // Expand shorthands
    const expanded = expandAllShorthands(result.properties);

    // Classify
    const classified = classifyProperties(expanded, classificationMap);
    const safe = filterByClassification(classified, 'SAFE');
    const enhance = filterByClassification(classified, 'ENHANCE');
    const breaking = filterByClassification(classified, 'BREAKING');
    const noEffect = filterByClassification(classified, 'NO_EFFECT');

    // Emit warnings for stripped classes
    for (const item of breaking) {
      warnings.push({
        code: ErrorCode.BREAKING_CSS,
        message: `"${cls}" resolves to "${item.property.property}: ${item.property.value}" which breaks layout in email clients. Stripped from responsive styles.`,
        severity: 'error',
      });
    }
    for (const item of noEffect) {
      warnings.push({
        code: ErrorCode.NO_EFFECT_CSS,
        message: `"${cls}" resolves to "${item.property.property}: ${item.property.value}" which has no effect in email clients. Stripped from responsive styles.`,
        severity: 'info',
      });
    }

    // Combine SAFE + ENHANCE for the media query (they go in <style> anyway)
    const validProps = [...safe, ...enhance].map((c) => c.property);
    if (validProps.length === 0) {
      continue;
    }

    const className = responsiveClassName(cls);
    const declarations = validProps
      .map((p) => `${p.property}: ${p.value} !important`)
      .join('; ');

    rules.push({ className, declarations });
  }

  return { rules, warnings };
}

/**
 * Assembles a complete `@media` block from responsive rules.
 *
 * @param rules      - Responsive rules from `resolveResponsiveClasses`.
 * @param breakpoint - Max-width breakpoint in pixels (default: 480).
 * @returns The `@media` block string, or empty string if no rules.
 */
export function buildMediaBlock(rules: ResponsiveRule[], breakpoint = 480): string {
  if (rules.length === 0) {
    return '';
  }

  const ruleStrings = rules
    .map((r) => `  .${r.className} { ${r.declarations}; }`)
    .join('\n');

  return `@media only screen and (max-width: ${breakpoint}px) {\n${ruleStrings}\n}`;
}

/**
 * Full pipeline: resolve responsive classes and build the media block.
 *
 * @param responsiveClasses - Array of `sm:` prefixed class names.
 * @param theme             - Resolved theme.
 * @param breakpoint        - Max-width breakpoint in pixels.
 * @returns Complete media query result.
 */
export function processResponsiveClasses(
  responsiveClasses: string[],
  theme: ResolvedTheme,
  breakpoint = 480,
  classificationMap?: ClassificationMap,
): MediaQueryResult {
  const { rules, warnings } = resolveResponsiveClasses(responsiveClasses, theme, classificationMap);
  const mediaBlock = buildMediaBlock(rules, breakpoint);
  return { mediaBlock, rules, warnings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a `sm:` class name to a CSS class name for the media query.
 * Replaces colons and special characters with hyphens.
 *
 * @param cls - E.g. `"sm:text-base"`.
 * @returns E.g. `"sm-text-base"`.
 */
function responsiveClassName(cls: string): string {
  return cls.replace(/:/g, '-').replace(/[[\]#.]/g, '\\$&');
}
