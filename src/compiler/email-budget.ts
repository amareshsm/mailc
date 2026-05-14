/**
 * Gmail clip budget checker.
 *
 * Gmail silently truncates emails whose raw HTML exceeds ~102KB, replacing
 * the rest with a "Message clipped [View entire message]" link. This is a
 * production-only failure mode — invisible in local preview tools.
 *
 * This module checks `outputSize` against the known threshold and emits an
 * `EMAIL_SIZE_LIMIT` warning when the compiled config targets Gmail clients.
 * The check is skipped entirely when Gmail is not in `targetClients`.
 *
 * Thresholds:
 * - WARN  : ≥ 85 KB  (83.3% of budget — approaching clip)
 * - CLIP  : ≥ 102 KB (Gmail's documented hard limit)
 *
 * @module compiler/email-budget
 */

import type { MCIssue, GmailClipRisk } from '../types.js';
import { ErrorCode } from '../errors/codes.js';

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/** Start warning at 85 KB — gives buffer before the hard clip. */
const GMAIL_WARN_BYTES = 85 * 1024;

/** Gmail clips emails that exceed ~102 KB of raw HTML. */
const GMAIL_CLIP_BYTES = 102 * 1024;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when any pattern in `targetClients` covers Gmail clients.
 *
 * Matches:
 * - `'gmail'`          — bare client name
 * - `'gmail.*'`        — all Gmail variants (desktop, mobile, etc.)
 * - `'gmail.desktop'`  — specific Gmail variant
 * - `'*'`              — wildcard covering all clients including Gmail
 *
 * Browser-safe: no picomatch import; Gmail pattern detection is simple
 * enough to handle with string ops.
 */
function targetsGmail(targetClients: string[]): boolean {
  return targetClients.some(
    (pattern) => pattern === '*' || pattern === 'gmail' || pattern.startsWith('gmail.'),
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Result of a single email budget check. */
export interface EmailBudgetResult {
  /** The warning issue to push into `compile()` warnings, or `null` when safe. */
  issue: MCIssue | null;
  /** Programmatic risk level for `CompileStats.gmailClipRisk`. */
  gmailClipRisk: GmailClipRisk;
}

/**
 * Checks whether the compiled output size triggers Gmail clip warnings.
 *
 * @param outputSize    - Final HTML length in bytes (characters, UTF-16 units).
 * @param targetClients - The resolved `config.targetClients` array.
 * @returns An `EmailBudgetResult` with an optional warning issue and risk level.
 */
export function checkEmailBudget(
  outputSize: number,
  targetClients: string[],
): EmailBudgetResult {
  if (!targetsGmail(targetClients)) {
    return { issue: null, gmailClipRisk: 'not-targeted' };
  }

  const kb = Math.round(outputSize / 1024);

  if (outputSize >= GMAIL_CLIP_BYTES) {
    return {
      issue: {
        code: ErrorCode.EMAIL_SIZE_LIMIT,
        message:
          `Email size (${kb} KB) exceeds Gmail's ~102 KB clip limit. ` +
          `Gmail will show "Message clipped" and hide the remaining content. ` +
          `Reduce HTML complexity, remove unused components, or split into shorter sections.`,
        severity: 'warning',
        fix: 'Keep compiled output under 102 KB. Use mc-attributes defaults to deduplicate inline styles, or reduce image alt-text and copy length.',
      },
      gmailClipRisk: 'exceeded',
    };
  }

  if (outputSize >= GMAIL_WARN_BYTES) {
    const pct = Math.round((outputSize / GMAIL_CLIP_BYTES) * 100);
    return {
      issue: {
        code: ErrorCode.EMAIL_SIZE_LIMIT,
        message:
          `Email size (${kb} KB) is at ${pct}% of Gmail's ~102 KB clip limit. ` +
          `If the template grows further, Gmail will clip the email.`,
        severity: 'warning',
        fix: 'Consider reducing template complexity to stay safely under the 102 KB Gmail clip threshold.',
      },
      gmailClipRisk: 'approaching',
    };
  }

  return { issue: null, gmailClipRisk: 'safe' };
}
