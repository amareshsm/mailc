/**
 * Unit tests for lint rules — styles, outlook, responsiveness, content.
 * Plus integration tests for the lintEmailHtml() entry function.
 */

import { describe, it, expect } from 'vitest';
import { noShorthandInInline, stylesAreInlined, noRelativeUnits } from '../../src/lint/rules/styles.js';
import { hasMsoConditionals, msoHasXmlNamespace } from '../../src/lint/rules/outlook.js';
import { hasMediaQueries, maxWidthSet } from '../../src/lint/rules/responsiveness.js';
import { noEmptyLinks, noJavascriptHref } from '../../src/lint/rules/content.js';
import { lintEmailHtml, getLintRuleIds, getLintRule } from '../../src/lint/index.js';

// ===========================================================================
// Style rules
// ===========================================================================

describe('no-shorthand-in-inline', () => {
  it('passes with longhand properties', () => {
    const html = '<td style="background-color:#fff;font-size:14px;">';
    expect(noShorthandInInline.check(html)).toEqual([]);
  });

  it('fails with font shorthand', () => {
    const html = '<td style="font: 14px/1.5 Arial;">';
    const issues = noShorthandInInline.check(html);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('font');
  });

  it('fails with background shorthand', () => {
    const html = '<td style="background: #fff url(img.png) no-repeat;">';
    const issues = noShorthandInInline.check(html);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('background');
  });

  it('does not flag background-color (longhand)', () => {
    expect(noShorthandInInline.check('<td style="background-color:#fff;">')).toEqual([]);
  });

  it('reports multiple shorthands in one element', () => {
    const html = '<td style="font: bold 14px Arial; background: red; flex: 1;">';
    const issues = noShorthandInInline.check(html);
    expect(issues).toHaveLength(3);
  });

  it('does not flag outline:none (email-safe reset)', () => {
    expect(noShorthandInInline.check('<img style="outline:none;text-decoration:none;">')).toEqual([]);
  });
});

describe('styles-are-inlined', () => {
  it('passes with no utility class attributes', () => {
    const html = '<td style="color:#333;"><div class="mc-responsive">';
    expect(stylesAreInlined.check(html)).toEqual([]);
  });

  it('flags utility classes that should be inlined', () => {
    const html = '<td class="bg-white text-sm p-4">';
    const issues = stylesAreInlined.check(html);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('info');
  });

  it('ignores mc- prefixed classes', () => {
    expect(stylesAreInlined.check('<div class="mc-responsive">')).toEqual([]);
  });
});

describe('no-relative-units', () => {
  it('passes with px units', () => {
    expect(noRelativeUnits.check('<td style="font-size:14px;padding:20px;">')).toEqual([]);
  });

  it('fails with rem units', () => {
    const issues = noRelativeUnits.check('<td style="font-size:1rem;">');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('rem');
  });

  it('fails with em units', () => {
    const issues = noRelativeUnits.check('<td style="padding:2em;">');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('em');
  });

  it('fails with vh units', () => {
    const issues = noRelativeUnits.check('<td style="height:100vh;">');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('vh');
  });

  it('fails with vw units', () => {
    const issues = noRelativeUnits.check('<td style="width:50vw;">');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('vw');
  });

  it('passes with percentage values', () => {
    expect(noRelativeUnits.check('<td style="width:100%;">')).toEqual([]);
  });
});

// ===========================================================================
// Outlook rules
// ===========================================================================

describe('has-mso-conditionals', () => {
  it('passes when MSO conditional is present', () => {
    expect(hasMsoConditionals.check('<!--[if mso]><table><![endif]-->')).toEqual([]);
  });

  it('fails when no MSO conditional', () => {
    const issues = hasMsoConditionals.check('<html><body></body></html>');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('has-mso-conditionals');
  });
});

describe('mso-has-xml-namespace', () => {
  it('passes when xmlns:v is present with MSO', () => {
    const html = '<html xmlns:v="urn:schemas-microsoft-com:vml"><!--[if mso]>test<![endif]--></html>';
    expect(msoHasXmlNamespace.check(html)).toEqual([]);
  });

  it('fails when MSO is present but xmlns:v is missing', () => {
    const html = '<html><!--[if mso]>test<![endif]--></html>';
    const issues = msoHasXmlNamespace.check(html);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('mso-has-xml-namespace');
  });

  it('skips when no MSO conditionals (rule not applicable)', () => {
    expect(msoHasXmlNamespace.check('<html><body></body></html>')).toEqual([]);
  });
});

// ===========================================================================
// Responsiveness rules
// ===========================================================================

describe('has-media-queries', () => {
  it('passes when @media is present', () => {
    expect(hasMediaQueries.check('<style>@media (max-width:600px){}</style>')).toEqual([]);
  });

  it('fails when no @media found', () => {
    const issues = hasMediaQueries.check('<style>body{margin:0;}</style>');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('info');
  });
});

describe('max-width-set', () => {
  it('passes when max-width is present', () => {
    expect(maxWidthSet.check('<div style="max-width:600px;">')).toEqual([]);
  });

  it('fails when no max-width found', () => {
    const issues = maxWidthSet.check('<div style="width:600px;">');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('max-width-set');
  });
});

// ===========================================================================
// Content rules
// ===========================================================================

describe('no-empty-links', () => {
  it('passes with valid href', () => {
    expect(noEmptyLinks.check('<a href="https://example.com">Click</a>')).toEqual([]);
  });

  it('fails with empty href', () => {
    const issues = noEmptyLinks.check('<a href="">Click</a>');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('no-empty-links');
  });

  it('fails with missing href', () => {
    const issues = noEmptyLinks.check('<a class="btn">Click</a>');
    expect(issues).toHaveLength(1);
  });

  it('reports each empty link', () => {
    const html = '<a href="">A</a><a href="https://ok.com">B</a><a>C</a>';
    expect(noEmptyLinks.check(html)).toHaveLength(2);
  });
});

describe('no-javascript-href', () => {
  it('passes with normal href', () => {
    expect(noJavascriptHref.check('<a href="https://example.com">Click</a>')).toEqual([]);
  });

  it('fails with javascript: href', () => {
    const issues = noJavascriptHref.check('<a href="javascript:alert(1)">Click</a>');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('no-javascript-href');
    expect(issues[0]!.severity).toBe('error');
  });
});

// ===========================================================================
// lintEmailHtml() — entry function
// ===========================================================================

describe('lintEmailHtml', () => {
  /** Minimal valid email for integration tests. */
  const validEmail = [
    '<!DOCTYPE html>',
    '<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title></title>',
    '<style>@media(max-width:600px){.r{width:100%!important;}}</style>',
    '<!--[if mso]><xml></xml><![endif]-->',
    '</head><body>',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0">',
    '<tr><td style="max-width:600px;">',
    '<img src="x.png" alt="" width="100" style="display:block;border:0;">',
    '<a href="https://example.com">Link</a>',
    '</td></tr></table></body></html>',
  ].join('');

  it('returns empty array for valid email', () => {
    const issues = lintEmailHtml(validEmail);
    expect(issues).toEqual([]);
  });

  it('detects multiple issues in bad HTML', () => {
    const badHtml = '<html><body><script>x</script><img src="x.png"><a href="javascript:void(0)">x</a></body></html>';
    const issues = lintEmailHtml(badHtml);
    // Should find: no doctype, no xmlns, no charset, no viewport, no title,
    // script tag, no mso, img-no-alt, img-no-display-block, img-no-border,
    // img-no-width, no media queries, no max-width, javascript href
    expect(issues.length).toBeGreaterThan(5);
  });

  it('skips table-has-role by default (a11y disabled)', () => {
    const html = [
      '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml">',
      '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title></title>',
      '<style>@media(max-width:600px){}</style><!--[if mso]><![endif]--></head>',
      '<body><table cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">',
      '<tr><td><a href="https://ok.com">OK</a></td></tr></table></body></html>',
    ].join('');
    const issues = lintEmailHtml(html);
    const roleIssues = issues.filter((i) => i.ruleId === 'table-has-role');
    expect(roleIssues).toHaveLength(0);
  });

  it('includes table-has-role when a11y is enabled', () => {
    const html = '<table cellpadding="0" cellspacing="0" border="0"><tr><td></td></tr></table>';
    const issues = lintEmailHtml(html, { accessibilityEnabled: true });
    const roleIssues = issues.filter((i) => i.ruleId === 'table-has-role');
    expect(roleIssues).toHaveLength(1);
  });

  it('respects disable option', () => {
    const html = '<html><body></body></html>'; // Missing lots of stuff
    const allIssues = lintEmailHtml(html);
    const withDisable = lintEmailHtml(html, { disable: ['has-doctype', 'has-xmlns'] });
    expect(withDisable.length).toBeLessThan(allIssues.length);
    expect(withDisable.some((i) => i.ruleId === 'has-doctype')).toBe(false);
    expect(withDisable.some((i) => i.ruleId === 'has-xmlns')).toBe(false);
  });
});

// ===========================================================================
// Utility functions
// ===========================================================================

describe('getLintRuleIds', () => {
  it('returns all 26 rule IDs', () => {
    const ids = getLintRuleIds();
    expect(ids).toHaveLength(26);
    expect(ids).toContain('has-doctype');
    expect(ids).toContain('no-javascript-href');
    expect(ids).toContain('hero-has-fallback-color');
    expect(ids).toContain('hero-image-is-https');
  });
});

describe('getLintRule', () => {
  it('returns the rule for a valid ID', () => {
    const rule = getLintRule('has-doctype');
    expect(rule).toBeDefined();
    expect(rule!.id).toBe('has-doctype');
    expect(rule!.category).toBe('structure');
  });

  it('returns undefined for unknown ID', () => {
    const rule = getLintRule('nonexistent' as 'has-doctype');
    expect(rule).toBeUndefined();
  });
});
