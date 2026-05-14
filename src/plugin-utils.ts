/**
 * Plugin-author utilities.
 *
 * Helpers for component plugins registered via `defineComponent()`. These
 * wrap parts of the compile context (theme, classification map, warnings)
 * that plugins need most often, with safe fallbacks when the context is
 * unavailable.
 *
 * Plugins are not required to use these — they exist to reduce duplication
 * and keep plugin output consistent with built-in components.
 *
 * @module plugin-utils
 */

import type { CompileContext, MCIssue } from './types.js';
import { ErrorCode } from './errors/codes.js';

// ---------------------------------------------------------------------------
// Theme reader
// ---------------------------------------------------------------------------

/**
 * Reads a color from `context.theme.colors` with a fallback.
 *
 * Plugins should declare their brand colors as fallbacks but defer to the
 * user's theme when they've configured a matching token. This lets users
 * re-skin plugin output by setting `theme.colors.<key>` in their mailc
 * config without forking the plugin.
 *
 * Supports both string colors and nested `{ DEFAULT: '...' }` objects
 * (the same shape Tailwind uses for color families).
 *
 * @param context - The compile context (or `undefined` for safe access).
 * @param key - The color key to look up in `theme.colors`.
 * @param fallback - The hex color to return if the token isn't defined.
 * @returns The resolved color, or the fallback.
 *
 * @example
 * const brand = themeColor(context, 'brand', '#7c3aed');
 */
export function themeColor(
  context: CompileContext | undefined | null,
  key: string,
  fallback: string,
): string {
  const colors = context?.theme?.colors;
  if (!colors) return fallback;
  const v = colors[key];
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && typeof v.DEFAULT === 'string') return v.DEFAULT;
  return fallback;
}

// ---------------------------------------------------------------------------
// Compatibility warnings
// ---------------------------------------------------------------------------

/**
 * Pushes a CSS-compatibility warning to `context.warnings` if the given
 * property is BREAKING or ENHANCE for the user's target email clients.
 *
 * Uses `context.classificationMap` (built from caniemail data) when present;
 * silently does nothing if the map isn't available (e.g. the user hasn't
 * configured `targetClients`).
 *
 * Plugins should call this for any "risky" CSS they emit inline —
 * `background-image`, `border-radius`, `box-shadow`, `gap`, `display:flex`,
 * etc. — properties that don't have universal email-client support.
 *
 * @param context - The compile context.
 * @param prop - The CSS property name (e.g. `'background-image'`).
 * @param value - The CSS value, included in the warning message.
 * @param node - Optional AST node — provides type and source location.
 *
 * @example
 * warnCss(context, 'background-image', `url('${imageUrl}')`, node);
 * warnCss(context, 'border-radius', '8px', node);
 */
export function warnCss(
  context: CompileContext | undefined | null,
  prop: string,
  value: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node?: { type?: string; loc?: any },
): void {
  const map = context?.classificationMap;
  if (!map || typeof map.get !== 'function') return;
  const cls = map.get(prop);
  if (cls !== 'BREAKING' && cls !== 'ENHANCE') return;

  const warnings = context?.warnings;
  if (!Array.isArray(warnings)) return;

  const issue: MCIssue = {
    code: ErrorCode.PLUGIN_CSS_COMPATIBILITY,
    severity: cls === 'BREAKING' ? 'warning' : 'info',
    message:
      cls === 'BREAKING'
        ? `Plugin <${node?.type ?? '?'}> emits "${prop}: ${value}" which breaks in some target clients.`
        : `Plugin <${node?.type ?? '?'}> emits "${prop}: ${value}" with partial client support.`,
    loc: node?.loc,
  };
  warnings.push(issue);
}
