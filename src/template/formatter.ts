/**
 * Formatter pipeline for template expressions.
 *
 * Chains user-supplied formatter callbacks left-to-right,
 * applying each to the output of the previous. Zero built-in
 * formatters — users bring their own.
 *
 * @module template/formatter
 */

import type { FormatterCall, FormatterMap } from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum output length from a single formatter (10KB). Prevents runaway formatters. */
const MAX_OUTPUT_LENGTH = 10_240;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Applies a chain of formatters to a value, left-to-right.
 *
 * Each formatter receives the output of the previous one. If a formatter
 * name is not found in the map, it is skipped and the value passes through.
 * Output is capped at 10KB per invocation to prevent runaway formatters.
 *
 * @param value        - The initial resolved value.
 * @param formatters   - Ordered list of formatter calls to apply.
 * @param formatterMap - Map of available formatter callbacks.
 * @returns The final formatted string.
 */
export function applyFormatters(
  value: unknown,
  formatters: FormatterCall[],
  formatterMap: FormatterMap,
): string {
  let current: unknown = value;

  for (const call of formatters) {
    const fn = formatterMap[call.name];

    if (!fn) {
      // Unknown formatter — skip, keep current value
      continue;
    }

    const result = fn(current, ...call.args);
    const str = String(result);

    // Cap output length
    current = str.length > MAX_OUTPUT_LENGTH
      ? str.slice(0, MAX_OUTPUT_LENGTH)
      : str;
  }

  return String(current);
}
