/**
 * Integration tests for Phase 16 — Accessibility.
 *
 * Tests the full compile() pipeline with accessibility enabled/disabled.
 * Verifies every attribute from docs/05-accessibility.md.
 *
 * Design rules:
 * - No test is vacuously true: every test is written to fail if the
 *   feature is broken/missing.
 * - Each test covers exactly one behaviour.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { DEFAULT_CONFIG } from '../../src/config.js';
import type { CompileResult, AccessibilityConfig } from '../../src/types.js';

/**
 * Asserts a value is non-nullable and narrows its type. Throws a clear error
 * if undefined/null. Used to avoid non-null assertions (`!`) while still
 * letting TypeScript narrow the type for subsequent property access.
 */
function assertDefined<T>(value: T, message = 'expected value to be defined'): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FULL_TEMPLATE = `
<mc>
  <mc-head>
    <mc-title>Order Confirmation</mc-title>
  </mc-head>
  <mc-body>
    <mc-section>
    <mc-column>
      <mc-text>Hello World</mc-text>
    </mc-column>
  </mc-section>
  </mc-body>
</mc>
`;

const NO_TITLE_TEMPLATE = `
<mc>
  <mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Hello World</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>
`;

const FR_TEMPLATE = `
<mc>
  <mc-body lang="fr">
  <mc-section>
    <mc-column>
      <mc-text>Bonjour</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>
`;

const RTL_TEMPLATE = `
<mc>
  <mc-body lang="ar" dir="rtl">
  <mc-section>
    <mc-column>
      <mc-text>مرحبا</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>
`;

const IMAGE_TEMPLATE = `
<mc>
  <mc-body>
  <mc-section>
    <mc-column>
      <mc-image src="https://example.com/photo.jpg" />
      <mc-image src="https://example.com/decorative.jpg" alt="" />
      <mc-image src="https://example.com/linked.jpg" alt="" href="https://example.com" />
      <mc-image src="https://example.com/good.jpg" alt="Product photo" />
    </mc-column>
  </mc-section>
</mc-body>
</mc>
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compileWith(
  template: string,
  a11y: Partial<AccessibilityConfig> = {},
): CompileResult {
  return compile(template, {
    config: {
      accessibility: {
        ...DEFAULT_CONFIG.accessibility,
        enabled: true,
        ...a11y,
      },
    },
  });
}

function compileOff(
  template: string,
  a11y: Partial<AccessibilityConfig> = {},
): CompileResult {
  return compile(template, {
    config: {
      accessibility: {
        ...DEFAULT_CONFIG.accessibility,
        enabled: false,
        ...a11y,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// A11Y ENABLED — Document-level attributes
// ---------------------------------------------------------------------------

describe('a11y enabled — document attributes', () => {
  it('adds lang="en" on <html>', () => {
    const { html } = compileWith(FULL_TEMPLATE);
    expect(html).toMatch(/<html[^>]*lang="en"/);
  });

  it('adds dir="ltr" on <html>', () => {
    const { html } = compileWith(FULL_TEMPLATE);
    expect(html).toMatch(/<html[^>]*dir="ltr"/);
  });

  it('adds xml:lang on <html> matching the lang attribute (not a hardcoded value)', () => {
    const { html } = compileWith(FULL_TEMPLATE);
    // xml:lang must match lang — both should be "en"
    expect(html).toMatch(/<html[^>]*lang="en"[^>]*xml:lang="en"/);
  });

  it('adds xml:lang on <body> matching <html lang>', () => {
    const { html } = compileWith(FULL_TEMPLATE);
    expect(html).toMatch(/<body[^>]*xml:lang="en"/);
  });

  it('injects <title> from mc-title', () => {
    const { html } = compileWith(FULL_TEMPLATE);
    expect(html).toContain('<title>Order Confirmation</title>');
  });

  it('<title> is STILL injected when a11y disabled (document content, not opt-in)', () => {
    const { html } = compileOff(FULL_TEMPLATE);
    expect(html).toContain('<title>Order Confirmation</title>');
  });
});

// ---------------------------------------------------------------------------
// A11Y ENABLED — xml:lang matches mc-body lang (regression: mismatch bug)
// ---------------------------------------------------------------------------

describe('a11y enabled — xml:lang tracks mc-body lang attribute', () => {
  it('xml:lang on <html> matches mc-body lang="fr", not accessibility.lang default', () => {
    const { html } = compileWith(FR_TEMPLATE);
    // Must be "fr" everywhere, NOT "en" (the accessibility.lang default)
    expect(html).toMatch(/<html[^>]*lang="fr"[^>]*xml:lang="fr"/);
    expect(html).not.toMatch(/<html[^>]*xml:lang="en"/);
  });

  it('xml:lang on <body> matches mc-body lang="fr", not accessibility.lang default', () => {
    const { html } = compileWith(FR_TEMPLATE);
    expect(html).toMatch(/<body[^>]*xml:lang="fr"/);
    expect(html).not.toMatch(/<body[^>]*xml:lang="en"/);
  });
});

// ---------------------------------------------------------------------------
// A11Y ENABLED — RTL support
// ---------------------------------------------------------------------------

describe('a11y enabled — RTL direction', () => {
  it('sets dir="rtl" on <html> from mc-body', () => {
    const { html } = compileWith(RTL_TEMPLATE);
    expect(html).toMatch(/<html[^>]*dir="rtl"/);
  });

  it('duplicates dir="rtl" on wrapper div', () => {
    const { html } = compileWith(RTL_TEMPLATE);
    // The wrapper div must carry dir="rtl" so webmail clients (which strip <html>) get RTL
    expect(html).toMatch(/<div[^>]*role="article"[^>]*dir="rtl"/);
  });

  it('duplicates lang="ar" on wrapper div', () => {
    const { html } = compileWith(RTL_TEMPLATE);
    expect(html).toMatch(/<div[^>]*role="article"[^>]*lang="ar"/);
  });
});

// ---------------------------------------------------------------------------
// A11Y ENABLED — Wrapper div (Good Email Code pattern)
// ---------------------------------------------------------------------------

describe('a11y enabled — wrapper div', () => {
  it('has role="article" on wrapper div', () => {
    const { html } = compileWith(FULL_TEMPLATE);
    expect(html).toMatch(/<div[^>]*role="article"/);
  });

  it('has aria-roledescription="email"', () => {
    const { html } = compileWith(FULL_TEMPLATE);
    expect(html).toMatch(/<div[^>]*aria-roledescription="email"/);
  });

  it('has aria-label sourced from mc-title', () => {
    const { html } = compileWith(FULL_TEMPLATE);
    expect(html).toMatch(/<div[^>]*aria-label="Order Confirmation"/);
  });

  it('has font-size:medium on wrapper', () => {
    const { html } = compileWith(FULL_TEMPLATE);
    expect(html).toContain('font-size:medium');
  });

  it('has font-size:max(16px,1rem) on wrapper', () => {
    const { html } = compileWith(FULL_TEMPLATE);
    expect(html).toContain('font-size:max(16px,1rem)');
  });

  it('omits aria-label when no mc-title present', () => {
    const { html } = compileWith(NO_TITLE_TEMPLATE);
    // role="article" still present but no aria-label since title is empty
    expect(html).toMatch(/<div[^>]*role="article"/);
    expect(html).not.toMatch(/aria-label=/);
  });

  it('font-size reset present even when no title', () => {
    const { html } = compileWith(NO_TITLE_TEMPLATE);
    expect(html).toContain('font-size:medium');
  });
});

// ---------------------------------------------------------------------------
// A11Y ENABLED — Title HTML escaping
// ---------------------------------------------------------------------------

describe('a11y enabled — title HTML escaping', () => {
  it('escapes & in <title>', () => {
    const template = `<mc>
  <mc-head><mc-title>Cats &amp; Dogs</mc-title></mc-head>
  <mc-body>
    <mc-section><mc-column><mc-text>Hi</mc-text></mc-column></mc-section>
  </mc-body>
</mc>`;
    const { html } = compileWith(template);
    // The title should not contain unescaped & inside <title> element
    expect(html).not.toMatch(/<title>[^<]*&[^a][^<]*<\/title>/);
  });

  it('escapes " in aria-label using &quot; entity', () => {
    const template = `<mc>
  <mc-head><mc-title>Say "Hello"</mc-title></mc-head>
  <mc-body>
    <mc-section><mc-column><mc-text>Hi</mc-text></mc-column></mc-section>
  </mc-body>
</mc>`;
    const { html } = compileWith(template);
    // The escapeHtmlAttr() function must turn " into &quot; so the attribute
    // stays valid. If unescaped, it would break out of aria-label="...".
    expect(html).toContain('aria-label="Say &quot;Hello&quot;"');
  });
});

// ---------------------------------------------------------------------------
// A11Y ENABLED — Layout tables
// ---------------------------------------------------------------------------

describe('a11y enabled — layout tables', () => {
  it('all tables have role="presentation"', () => {
    const { html } = compileWith(FULL_TEMPLATE);
    assertDefined(html);
    const tables = html.match(/<table[^>]*>/g) ?? [];
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      expect(table).toContain('role="presentation"');
    }
  });
});

// ---------------------------------------------------------------------------
// A11Y DISABLED — only the wrapper enhancement is skipped
// ---------------------------------------------------------------------------
//
// Title and xml:lang are document content / standard markup correctness and
// run regardless of `enabled`. Only the wrapper aria-label + font-size reset
// (a genuine a11y enhancement) is gated by `accessibility.enabled = false`.

describe('a11y disabled — only wrapper enhancement is gated', () => {
  it('STILL adds xml:lang on <html> (standard XHTML markup)', () => {
    const { html } = compileOff(FULL_TEMPLATE);
    expect(html).toMatch(/<html[^>]*xml:lang/);
  });

  it('STILL adds xml:lang on <body> (required for Windows Outlook + Narrator)', () => {
    const { html } = compileOff(FULL_TEMPLATE);
    expect(html).toMatch(/<body[^>]*xml:lang/);
  });

  it('does NOT add aria-label to wrapper', () => {
    const { html } = compileOff(FULL_TEMPLATE);
    expect(html).not.toContain('aria-label=');
  });

  it('does NOT add font-size:medium to wrapper', () => {
    const { html } = compileOff(FULL_TEMPLATE);
    expect(html).not.toContain('font-size:medium');
  });

  it('STILL injects mc-title content (document content, not opt-in)', () => {
    const { html } = compileOff(FULL_TEMPLATE);
    expect(html).toContain('<title>Order Confirmation</title>');
  });

  it('still has role="article" (always present — not gated by enabled)', () => {
    const { html } = compileOff(FULL_TEMPLATE);
    expect(html).toMatch(/<div[^>]*role="article"/);
  });

  it('still has role="presentation" on tables (always present — not gated by enabled)', () => {
    const { html } = compileOff(FULL_TEMPLATE);
    assertDefined(html);
    const tables = html.match(/<table[^>]*>/g) ?? [];
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      expect(table).toContain('role="presentation"');
    }
  });
});

// ---------------------------------------------------------------------------
// Alt text warnings (always active regardless of enabled)
// ---------------------------------------------------------------------------

describe('alt text warnings', () => {
  it('warns on missing alt (enabled: false — always active)', () => {
    const result = compileOff(IMAGE_TEMPLATE);
    const altWarning = result.warnings.find((w) => w.code === 'MISSING_ALT');
    assertDefined(altWarning);
    expect(altWarning.severity).toBe('warning');
  });

  it('warns on missing alt (enabled: true — still active)', () => {
    const result = compileWith(IMAGE_TEMPLATE);
    const altWarning = result.warnings.find((w) => w.code === 'MISSING_ALT');
    expect(altWarning).toBeDefined();
  });

  it('does not warn on alt="" (decorative image)', () => {
    const template = `<mc>
  <mc-body><mc-section><mc-column><mc-image src="x.jpg" alt="" /></mc-column></mc-section></mc-body>
</mc>`;
    const result = compileOff(template);
    expect(result.warnings.find((w) => w.code === 'MISSING_ALT')).toBeUndefined();
  });

  it('does not warn on alt="description" (described image)', () => {
    const template = `<mc>
  <mc-body><mc-section><mc-column><mc-image src="x.jpg" alt="Photo" /></mc-column></mc-section></mc-body>
</mc>`;
    const result = compileOff(template);
    expect(result.warnings.find((w) => w.code === 'MISSING_ALT')).toBeUndefined();
  });

  it('emits LINKED_IMAGE_EMPTY_ALT info for linked image with alt=""', () => {
    const result = compileOff(IMAGE_TEMPLATE);
    const linkedInfo = result.info.find((w) => w.code === 'LINKED_IMAGE_EMPTY_ALT');
    assertDefined(linkedInfo);
    expect(linkedInfo.severity).toBe('info');
  });

  it('emits MISSING_ALT (not LINKED_IMAGE_EMPTY_ALT) when linked image has no alt at all', () => {
    const template = `<mc>
  <mc-body><mc-section><mc-column><mc-image src="x.jpg" href="https://example.com" /></mc-column></mc-section></mc-body>
</mc>`;
    const result = compileOff(template);
    // Missing alt entirely on a linked image → MISSING_ALT warning, not LINKED_IMAGE_EMPTY_ALT
    expect(result.warnings.find((w) => w.code === 'MISSING_ALT')).toBeDefined();
    expect(result.info.find((w) => w.code === 'LINKED_IMAGE_EMPTY_ALT')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// enforceAltText
// ---------------------------------------------------------------------------

describe('enforceAltText', () => {
  it('escalates missing alt to error severity when enforceAltText: true', () => {
    const template = `<mc>
  <mc-body><mc-section><mc-column><mc-image src="x.jpg" /></mc-column></mc-section></mc-body>
</mc>`;
    const result = compileOff(template, { enforceAltText: true });
    const altIssue = result.warnings.find((w) => w.code === 'MISSING_ALT');
    assertDefined(altIssue);
    expect(altIssue.severity).toBe('error');
  });

  it('does not escalate when enforceAltText: false (default warning level)', () => {
    const template = `<mc>
  <mc-body><mc-section><mc-column><mc-image src="x.jpg" /></mc-column></mc-section></mc-body>
</mc>`;
    const result = compileOff(template, { enforceAltText: false });
    const altIssue = result.warnings.find((w) => w.code === 'MISSING_ALT');
    assertDefined(altIssue);
    expect(altIssue.severity).toBe('warning');
  });

  it('enforceAltText does NOT fail compilation — result.errors stays empty', () => {
    // enforceAltText escalates severity in the issue but does NOT stop
    // the compiler from producing HTML. It is a severity label, not a fatal error.
    const template = `<mc>
  <mc-body><mc-section><mc-column><mc-image src="x.jpg" /></mc-column></mc-section></mc-body>
</mc>`;
    const result = compileOff(template, { enforceAltText: true });
    expect(result.html).not.toBeNull();
    expect(result.errors.filter((e) => e.code === 'MISSING_ALT')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// MISSING_TITLE warning (always active)
// ---------------------------------------------------------------------------

describe('MISSING_TITLE warning', () => {
  it('warns when no mc-title (a11y enabled)', () => {
    const result = compileWith(NO_TITLE_TEMPLATE);
    expect(result.warnings.some((w) => w.code === 'MISSING_TITLE')).toBe(true);
  });

  it('warns when no mc-title (a11y disabled — always active)', () => {
    const result = compileOff(NO_TITLE_TEMPLATE);
    expect(result.warnings.some((w) => w.code === 'MISSING_TITLE')).toBe(true);
  });

  it('does not warn when mc-title is present', () => {
    const result = compileWith(FULL_TEMPLATE);
    expect(result.warnings.some((w) => w.code === 'MISSING_TITLE')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Color contrast
// gray-300 (#d1d5db) on gray-100 (#f3f4f6) ≈ 1.34:1 → warning tier (< 3:1)
// ---------------------------------------------------------------------------

describe('color contrast', () => {
  it('emits warning by default for very low contrast (checkContrast defaults to true)', () => {
    // gray-300 on gray-100 ≈ 1.34:1, well below the 3:1 large-text floor
    const template = `<mc>
  <mc-body><mc-section><mc-column><mc-text class="text-gray-300 bg-gray-100">Low</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = compile(template, { templateStyle: 'class' });
    const contrastIssue = result.warnings.find((w) => w.code === 'LOW_CONTRAST');
    assertDefined(contrastIssue);
    expect(contrastIssue.severity).toBe('warning');
  });

  it('is suppressed when checkContrast: false', () => {
    const template = `<mc>
  <mc-body><mc-section><mc-column><mc-text class="text-gray-300 bg-gray-100">Low</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = compile(template, {
      config: {
        accessibility: {
          ...DEFAULT_CONFIG.accessibility,
          checkContrast: false,
        },
      },
    });
    expect(result.warnings.find((w) => w.code === 'LOW_CONTRAST')).toBeUndefined();
    expect(result.info.find((w) => w.code === 'LOW_CONTRAST')).toBeUndefined();
  });
});
