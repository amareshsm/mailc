/**
 * @file tests/compile/email-budget.test.ts
 *
 * Tests for the Gmail clip budget warning (EMAIL_SIZE_LIMIT).
 *
 * Gmail silently clips emails > ~102 KB. The warning fires only when the
 * compiled config targets a Gmail client. Tests cover:
 * - Unit: checkEmailBudget() thresholds and pattern matching
 * - Integration: compile() wiring — warning appears in result.warnings and
 *   risk level appears in result.stats.gmailClipRisk
 */

import { describe, it, expect } from 'vitest';
import { checkEmailBudget } from '../../src/compiler/email-budget.js';
import { compile } from '../../src/compile.js';
import { ErrorCode } from '../../src/errors/codes.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KB = 1024;

/** Minimal valid mailc document. */
const MINIMAL_DOC = `<mc><mc-body><mc-section><mc-column><mc-text>Hi</mc-text></mc-column></mc-section></mc-body></mc>`;

/** Pads a source string so the compiled output reaches approximately `targetBytes`. */
function padToBytes(targetBytes: number): string {
  // Each mc-text adds ~60 bytes of compiled output overhead plus content length.
  // We pad the text content itself to reach the desired output size.
  const padding = 'x'.repeat(targetBytes);
  return `<mc><mc-body><mc-section><mc-column><mc-text>${padding}</mc-text></mc-column></mc-section></mc-body></mc>`;
}

// ---------------------------------------------------------------------------
// Unit: checkEmailBudget()
// ---------------------------------------------------------------------------

describe('checkEmailBudget() — thresholds', () => {
  it('returns safe + no issue for small output when gmail targeted', () => {
    const result = checkEmailBudget(50 * KB, ['gmail.*']);
    expect(result.gmailClipRisk).toBe('safe');
    expect(result.issue).toBeNull();
  });

  it('returns approaching + issue at 85 KB boundary', () => {
    const result = checkEmailBudget(85 * KB, ['gmail.*']);
    expect(result.gmailClipRisk).toBe('approaching');
    expect(result.issue).not.toBeNull();
    expect(result.issue?.code).toBe(ErrorCode.EMAIL_SIZE_LIMIT);
    expect(result.issue?.severity).toBe('warning');
    expect(result.issue?.message).toContain('102 KB');
  });

  it('returns approaching for size between 85 KB and 102 KB', () => {
    const result = checkEmailBudget(95 * KB, ['gmail.*']);
    expect(result.gmailClipRisk).toBe('approaching');
    expect(result.issue?.message).toContain('93%');
  });

  it('returns exceeded + issue at exactly 102 KB', () => {
    const result = checkEmailBudget(102 * KB, ['gmail.*']);
    expect(result.gmailClipRisk).toBe('exceeded');
    expect(result.issue?.code).toBe(ErrorCode.EMAIL_SIZE_LIMIT);
    expect(result.issue?.message).toContain('clipped');
  });

  it('returns exceeded for size well above 102 KB', () => {
    const result = checkEmailBudget(200 * KB, ['gmail.*']);
    expect(result.gmailClipRisk).toBe('exceeded');
  });

  it('issue has a fix hint', () => {
    const result = checkEmailBudget(110 * KB, ['gmail.*']);
    expect(result.issue?.fix).toBeTruthy();
  });
});

describe('checkEmailBudget() — Gmail targeting detection', () => {
  it('triggers for gmail.* wildcard pattern', () => {
    expect(checkEmailBudget(102 * KB, ['gmail.*']).gmailClipRisk).toBe('exceeded');
  });

  it('triggers for specific gmail variant', () => {
    expect(checkEmailBudget(102 * KB, ['gmail.desktop']).gmailClipRisk).toBe('exceeded');
  });

  it('triggers for bare gmail pattern', () => {
    expect(checkEmailBudget(102 * KB, ['gmail']).gmailClipRisk).toBe('exceeded');
  });

  it('triggers when gmail is one of multiple targets', () => {
    const result = checkEmailBudget(102 * KB, ['apple-mail.*', 'gmail.*', 'outlook.*']);
    expect(result.gmailClipRisk).toBe('exceeded');
  });

  it('triggers for wildcard * covering all clients including gmail', () => {
    expect(checkEmailBudget(102 * KB, ['*']).gmailClipRisk).toBe('exceeded');
  });

  it('returns not-targeted when no gmail pattern in targetClients', () => {
    const result = checkEmailBudget(200 * KB, ['apple-mail.*', 'outlook.*']);
    expect(result.gmailClipRisk).toBe('not-targeted');
    expect(result.issue).toBeNull();
  });

  it('returns not-targeted for empty targetClients', () => {
    const result = checkEmailBudget(200 * KB, []);
    expect(result.gmailClipRisk).toBe('not-targeted');
    expect(result.issue).toBeNull();
  });

  it('does NOT trigger for outlook-only targeting even at huge size', () => {
    const result = checkEmailBudget(500 * KB, ['outlook.*', 'yahoo.*']);
    expect(result.gmailClipRisk).toBe('not-targeted');
    expect(result.issue).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Integration: compile() wiring
// ---------------------------------------------------------------------------

describe('compile() — Gmail clip budget integration', () => {
  it('stats.gmailClipRisk is safe for a small email targeting gmail', () => {
    const result = compile(MINIMAL_DOC, {
      config: { targetClients: ['gmail.*'] },
    });
    expect(result.stats.gmailClipRisk).toBe('safe');
    const sizeWarnings = result.warnings.filter((w) => w.code === ErrorCode.EMAIL_SIZE_LIMIT);
    expect(sizeWarnings).toHaveLength(0);
  });

  it('stats.gmailClipRisk is not-targeted when gmail excluded from targetClients', () => {
    const result = compile(MINIMAL_DOC, {
      config: { targetClients: ['apple-mail.*', 'outlook.*'] },
    });
    expect(result.stats.gmailClipRisk).toBe('not-targeted');
    const sizeWarnings = result.warnings.filter((w) => w.code === ErrorCode.EMAIL_SIZE_LIMIT);
    expect(sizeWarnings).toHaveLength(0);
  });

  it('emits no EMAIL_SIZE_LIMIT warning for a normal-sized email', () => {
    const result = compile(MINIMAL_DOC);
    // Default targetClients includes gmail.* — but a minimal doc is well under 85 KB
    const sizeWarnings = result.warnings.filter((w) => w.code === ErrorCode.EMAIL_SIZE_LIMIT);
    expect(sizeWarnings).toHaveLength(0);
  });

  it('emits EMAIL_SIZE_LIMIT warning when output exceeds 102 KB and gmail targeted', () => {
    // Create a large source that will generate output > 102 KB
    const largeSource = padToBytes(110 * KB);
    const result = compile(largeSource, {
      config: { targetClients: ['gmail.*'] },
    });
    const sizeWarnings = result.warnings.filter((w) => w.code === ErrorCode.EMAIL_SIZE_LIMIT);
    expect(sizeWarnings.length).toBeGreaterThan(0);
    expect(sizeWarnings[0]?.severity).toBe('warning');
    expect(result.stats.gmailClipRisk).toBe('exceeded');
  });

  it('does NOT emit EMAIL_SIZE_LIMIT warning for large email not targeting gmail', () => {
    const largeSource = padToBytes(110 * KB);
    const result = compile(largeSource, {
      config: { targetClients: ['apple-mail.*', 'outlook.*'] },
    });
    const sizeWarnings = result.warnings.filter((w) => w.code === ErrorCode.EMAIL_SIZE_LIMIT);
    expect(sizeWarnings).toHaveLength(0);
    expect(result.stats.gmailClipRisk).toBe('not-targeted');
  });

  it("targetClients:'default' (which includes gmail.*) produces gmailClipRisk in stats", () => {
    // Opting into the curated 5-client preset → gmail.* is targeted →
    // clip-risk calculator runs.
    const result = compile(MINIMAL_DOC, { targetClients: 'default' });
    expect(result.stats.gmailClipRisk).not.toBe('not-targeted');
    expect(['safe', 'approaching', 'exceeded']).toContain(result.stats.gmailClipRisk);
  });

  it("default behavior (omitted targetClients) → gmailClipRisk is 'not-targeted'", () => {
    // Omitting targetClients means "no client gating," so client-specific
    // checks (incl. Gmail clip-risk) are skipped.
    const result = compile(MINIMAL_DOC);
    expect(result.stats.gmailClipRisk).toBe('not-targeted');
  });

  it('warning code is EMAIL_SIZE_LIMIT from ErrorCode enum', () => {
    const largeSource = padToBytes(110 * KB);
    const result = compile(largeSource, {
      config: { targetClients: ['gmail.*'] },
    });
    const warn = result.warnings.find((w) => w.code === ErrorCode.EMAIL_SIZE_LIMIT);
    expect(warn?.code).toBe('EMAIL_SIZE_LIMIT');
  });
});
