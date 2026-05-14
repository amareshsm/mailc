/**
 * Tests for src/post-processor/accessibility.ts
 *
 * Covers: applyA11yPostProcessing — title injection, xml:lang,
 * wrapper enhancement, MISSING_TITLE warning.
 */

import { describe, it, expect } from 'vitest';
import { applyA11yPostProcessing } from '../../src/post-processor/accessibility.js';

// ---------------------------------------------------------------------------
// Test HTML fixture — mirrors what compileBody() produces
// ---------------------------------------------------------------------------

const BASE_HTML =
  '<!DOCTYPE html>' +
  '<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">' +
  '<head><meta charset="utf-8"><title></title></head>' +
  '<body style="margin:0;padding:0;">' +
  '<div role="article" aria-roledescription="email" lang="en" dir="ltr">' +
  '<table role="presentation"><tr><td>Hello</td></tr></table>' +
  '</div>' +
  '</body></html>';

// ---------------------------------------------------------------------------
// MISSING_TITLE warning (always-on)
// ---------------------------------------------------------------------------

describe('MISSING_TITLE warning', () => {
  it('warns when title is empty and a11y is disabled', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: false,
      title: '',
    });
    expect(result.issues.length).toBe(1);
    expect(result.issues[0]!.code).toBe('MISSING_TITLE');
    expect(result.issues[0]!.severity).toBe('warning');
  });

  it('warns when title is empty and a11y is enabled', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: true,
      title: '',
    });
    expect(result.issues.some((i) => i.code === 'MISSING_TITLE')).toBe(true);
  });

  it('does not warn when title is provided', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: true,
      title: 'My Email',
    });
    expect(result.issues.some((i) => i.code === 'MISSING_TITLE')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// `enabled: false` — only the wrapper enhancement is skipped
// ---------------------------------------------------------------------------
//
// Title and xml:lang are document content / standard markup correctness and
// run regardless of `enabled`. Only the wrapper aria-label + font-size reset
// (a genuine a11y enhancement) is gated.

describe('a11y disabled — only gates wrapper enhancement', () => {
  it('still injects <title> when disabled', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: false,
      title: 'My Email',
    });
    expect(result.html).toContain('<title>My Email</title>');
  });

  it('still adds xml:lang on <html> when disabled', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: false,
      title: 'My Email',
    });
    expect(result.html).toMatch(/<html[^>]*xml:lang="en"/);
  });

  it('still adds xml:lang on <body> when disabled', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: false,
      title: 'My Email',
    });
    expect(result.html).toMatch(/<body[^>]*xml:lang="en"/);
  });

  it('does NOT add aria-label on wrapper when disabled', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: false,
      title: 'My Email',
    });
    const wrapper = /<div role="article"[^>]*>/.exec(result.html)?.[0] ?? '';
    expect(wrapper).not.toContain('aria-label');
    expect(wrapper).not.toContain('font-size');
  });

  it('no issues when title is provided', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: false,
      title: 'My Email',
    });
    expect(result.issues.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Title injection
// ---------------------------------------------------------------------------

describe('title injection', () => {
  it('injects title into empty <title> tag', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: true,
      title: 'Welcome Email',
    });
    expect(result.html).toContain('<title>Welcome Email</title>');
    expect(result.html).not.toContain('<title></title>');
  });

  it('escapes HTML in title', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: true,
      title: 'Hello <World> & "Friends"',
    });
    expect(result.html).toContain('<title>Hello &lt;World&gt; &amp; "Friends"</title>');
  });

  it('does not inject title when title is empty (even if enabled)', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: true,
      title: '',
    });
    expect(result.html).toContain('<title></title>');
  });
});

// ---------------------------------------------------------------------------
// xml:lang injection
// ---------------------------------------------------------------------------

describe('xml:lang injection', () => {
  it('adds xml:lang alongside lang on <html>', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: true,
      title: 'Test',
    });
    expect(result.html).toContain('lang="en" xml:lang="en"');
  });

  it('xml:lang mirrors lang already on <html>', () => {
    const frHtml =
      '<!DOCTYPE html>' +
      '<html lang="fr" dir="ltr" xmlns="http://www.w3.org/1999/xhtml">' +
      '<head><title></title></head>' +
      '<body style="margin:0;">' +
      '<div role="article" aria-roledescription="email" lang="fr" dir="ltr">' +
      '<p>Bonjour</p></div></body></html>';
    const result = applyA11yPostProcessing(frHtml, { enabled: true, title: 'Test' });
    expect(result.html).toContain('xml:lang="fr"');
  });
});

// ---------------------------------------------------------------------------
// Wrapper enhancement
// ---------------------------------------------------------------------------

describe('wrapper enhancement', () => {
  it('adds aria-label when title is provided', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: true,
      title: 'Newsletter',
    });
    expect(result.html).toContain('aria-label="Newsletter"');
  });

  it('adds font-size reset to wrapper', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: true,
      title: 'Newsletter',
    });
    expect(result.html).toContain('font-size:medium;font-size:max(16px,1rem);');
  });

  it('does not add aria-label when title is empty', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: true,
      title: '',
    });
    expect(result.html).not.toContain('aria-label');
    // But font-size reset should still be added
    expect(result.html).toContain('font-size:medium;');
  });

  it('escapes HTML attributes in aria-label', () => {
    const result = applyA11yPostProcessing(BASE_HTML, {
      enabled: true,
      title: 'Sale "50% off" & more',
    });
    expect(result.html).toContain('aria-label="Sale &quot;50% off&quot; &amp; more"');
  });
});

// ---------------------------------------------------------------------------
// RTL support
// ---------------------------------------------------------------------------

describe('RTL support', () => {
  const RTL_HTML = BASE_HTML.replace(/dir="ltr"/g, 'dir="rtl"').replace(/lang="en"/g, 'lang="ar"');

  it('preserves RTL direction in wrapper', () => {
    const result = applyA11yPostProcessing(RTL_HTML, {
      enabled: true,
      title: 'Arabic Email',
    });
    expect(result.html).toContain('dir="rtl"');
    expect(result.html).toContain('xml:lang="ar"');
  });
});
