/**
 * CSS checker — validates CSS against email client support using caniemail.
 *
 * Wraps the `caniemail-sdk` package to check CSS properties against the
 * user's configured target email clients. Results are cached per
 * compilation to avoid redundant checks.
 *
 * @module css/checker
 */
import { caniemail, groupIssues } from 'caniemail-sdk';
import type { IssueGroup } from 'caniemail-sdk';

import type { CSSProperty, MCIssue, PropertySupport } from '../types.js';
import { ErrorCode } from '../errors/codes.js';

/** Feature issue type extracted from caniemail-sdk's IssueGroup. */
type FeatureIssue = IssueGroup['issue'];

/** Map from CSS property name to per-client support breakdown. */
export type PropertySupportMap = Map<string, PropertySupport>;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single compatibility issue found by the checker. */
export interface CSSCheckIssue {
  /** The CSS property that has an issue. */
  property: string;
  /** Human-readable description of the issue. */
  message: string;
  /** Email clients where the property is unsupported or partial. */
  affectedClients: string[];
  /** Whether this is a hard error or a partial-support warning. */
  severity: 'error' | 'warning';
  /** Notes from caniemail about the issue. */
  notes: string[];
}

/** Result of checking CSS properties against target clients. */
export interface CSSCheckResult {
  /** All compatibility issues found. */
  issues: CSSCheckIssue[];
  /** `true` if no errors were found (warnings are ok). */
  success: boolean;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

/**
 * Simple in-memory cache keyed by CSS string + client list.
 * Reset between compilations via `clearCheckerCache()`.
 */
const cache = new Map<string, CSSCheckResult>();

/**
 * Module-level cache for property support maps, keyed by sorted client list.
 */
const supportMapCache = new Map<string, PropertySupportMap>();

/**
 * Clears the checker cache. Call at the start of each compilation.
 */
export function clearCheckerCache(): void {
  cache.clear();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds a map from CSS property name to per-client support breakdown.
 *
 * Runs a single caniemail probe with a representative CSS property set.
 * For each property, records which clients report errors (unsupported) or
 * warnings (partial). The `supported` array is intentionally left empty —
 * we only know what's broken, not the full set of "all clients".
 *
 * Results are cached per target client set.
 *
 * Browser-safe: no `node:*` imports.
 *
 * @param targetClients - Client glob patterns, e.g. `["gmail.*", "outlook.*"]`.
 * @param probeCSS      - The CSS to probe, typically the full probe string from the classifier.
 * @returns A map from property name to `{ supported, partial, unsupported }`.
 */
export function buildPropertySupportMap(
  targetClients: string[],
  probeCSS: string,
): PropertySupportMap {
  const cacheKey = [...targetClients].sort().join(',');
  const cached = supportMapCache.get(cacheKey);
  if (cached) return cached;

  const map: PropertySupportMap = new Map();

  try {
    const result = caniemail({
      clients: targetClients as Parameters<typeof caniemail>[0]['clients'],
      css: probeCSS,
    });

    // Collect unsupported clients per property (errors)
    const unsupported = new Map<string, string[]>();
    const errorGroups = groupIssues(result.issues.errors);
    for (const group of errorGroups) {
      const prop = group.issue.title;
      if (!unsupported.has(prop)) unsupported.set(prop, []);
      unsupported.get(prop)!.push(...group.clients);
    }

    // Collect partial clients per property (warnings)
    const partial = new Map<string, string[]>();
    const warnGroups = groupIssues(result.issues.warnings);
    for (const group of warnGroups) {
      const prop = group.issue.title;
      if (!partial.has(prop)) partial.set(prop, []);
      partial.get(prop)!.push(...group.clients);
    }

    // Build final map for all properties that appear in any group
    const allProps = new Set([...unsupported.keys(), ...partial.keys()]);
    for (const prop of allProps) {
      map.set(prop, {
        supported: [],  // unknown — we only track problems
        partial: partial.get(prop) ?? [],
        unsupported: unsupported.get(prop) ?? [],
      });
    }
  } catch {
    // caniemail may throw for unknown client patterns — return empty map
  }

  supportMapCache.set(cacheKey, map);
  return map;
}

/**
 * Checks an array of CSS properties against target email clients.
 *
 * Converts properties to a CSS string, runs it through `caniemail-sdk`,
 * and returns structured issues. Results are cached per unique CSS+clients
 * combination.
 *
 * @param props          - CSS properties to check.
 * @param targetClients  - Client globs, e.g. `["gmail.*", "outlook.*"]`.
 * @returns Check result with issues and success flag.
 */
export function checkCSS(
  props: CSSProperty[],
  targetClients: string[],
): CSSCheckResult {
  if (props.length === 0) {
    return { issues: [], success: true };
  }

  const invalid = props.filter((p) => !isValidPropertyName(p.property));
  if (invalid.length > 0) {
    const names = invalid.map((p) => `"${p.property}"`).join(', ');
    return {
      issues: [{
        property: invalid[0]!.property,
        message: `Invalid CSS property name(s): ${names}. Only CSS property names are accepted (e.g. "color", "font-size").`,
        affectedClients: [],
        severity: 'error',
        notes: [],
      }],
      success: false,
    };
  }

  const cssString = propertiesToCSS(props);
  const cacheKey = buildCacheKey(cssString, targetClients);

  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const result = runCheck(cssString, targetClients);
  cache.set(cacheKey, result);
  return result;
}

/**
 * Converts CSS check issues to MCIssue format for the warning system.
 *
 * @param checkIssues - Issues from `checkCSS`.
 * @returns Array of MCIssue objects.
 */
export function checkIssuesToMCIssues(checkIssues: CSSCheckIssue[]): MCIssue[] {
  const result: MCIssue[] = [];
  for (const issue of checkIssues) {
    result.push({
      code: issue.severity === 'error'
        ? ErrorCode.BREAKING_CSS
        : ErrorCode.UNSUPPORTED_UTILITY,
      message: issue.message,
      severity: issue.severity === 'error' ? 'error' : 'warning',
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Validates that a CSS property name is syntactically well-formed.
 * Rejects anything that isn't a plain lowercase identifier (no selectors,
 * pseudo-classes, at-rules, or other non-property strings).
 *
 * @param name - The property name to check.
 * @returns `true` if the name looks like a real CSS property.
 */
function isValidPropertyName(name: string): boolean {
  return /^-?[a-z][a-z0-9-]*$/.test(name.trim());
}

/**
 * Returns true for caniemail issue titles that represent real CSS property
 * or feature support issues (e.g. "color", "display", "display:flex").
 * Returns false for structural CSS feature titles injected by our `p {}`
 * wrapper — those always contain spaces or start with `@` or `:`
 * (e.g. "Type selector", "Class selector", "@media queries", ":hover").
 */
function isPropertyOrFeatureTitle(title: string): boolean {
  const t = title.trim();
  return t.length > 0 && !t.includes(' ') && !t.startsWith('@') && !t.startsWith(':');
}

/**
 * Builds a CSS rule from properties for caniemail input.
 * Uses a plain tag selector to avoid caniemail flagging selector features.
 *
 * @param props - CSS properties (must have valid names).
 * @returns CSS string like `p { color: red; font-size: 16px; }`.
 */
function propertiesToCSS(props: CSSProperty[]): string {
  const declarations = props
    .map((p) => `${p.property}: ${p.value}`)
    .join('; ');
  return `p { ${declarations}; }`;
}

/**
 * Builds a cache key from CSS string and client list.
 *
 * @param cssString     - The CSS string to check.
 * @param targetClients - Client glob array.
 * @returns A unique cache key.
 */
function buildCacheKey(cssString: string, targetClients: string[]): string {
  return `${targetClients.sort().join(',')}|${cssString}`;
}

/**
 * Runs the caniemail check and transforms results into our format.
 *
 * @param cssString     - CSS to check.
 * @param targetClients - Client globs.
 * @returns Structured check result.
 */
function runCheck(cssString: string, targetClients: string[]): CSSCheckResult {
  const canIResult = caniemail({
    clients: targetClients as Parameters<typeof caniemail>[0]['clients'],
    css: cssString,
  });

  const issues: CSSCheckIssue[] = [];

  const errorGroups = groupIssues(canIResult.issues.errors);
  for (const group of errorGroups) {
    if (!isPropertyOrFeatureTitle(group.issue.title)) continue;
    issues.push(featureGroupToIssue(group.issue, group.clients, 'error'));
  }

  const warningGroups = groupIssues(canIResult.issues.warnings);
  for (const group of warningGroups) {
    if (!isPropertyOrFeatureTitle(group.issue.title)) continue;
    issues.push(featureGroupToIssue(group.issue, group.clients, 'warning'));
  }

  return {
    issues,
    success: issues.length === 0,
  };
}

/**
 * Converts a grouped caniemail feature issue into our CSSCheckIssue format.
 *
 * @param issue    - The caniemail feature issue.
 * @param clients  - Affected email clients.
 * @param severity - Whether it's an error or warning.
 * @returns A structured check issue.
 */
function featureGroupToIssue(
  issue: FeatureIssue,
  clients: string[],
  severity: 'error' | 'warning',
): CSSCheckIssue {
  const clientList = clients.join(', ');
  const message = severity === 'error'
    ? `"${issue.title}" is not supported in: ${clientList}`
    : `"${issue.title}" is only partially supported in: ${clientList}`;

  return {
    property: issue.title,
    message,
    affectedClients: clients,
    severity,
    notes: issue.notes,
  };
}
