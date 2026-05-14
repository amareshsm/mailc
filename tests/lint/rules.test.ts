/**
 * Unit tests for lint rules — structure, tables, images.
 *
 * Tests each rule individually with passing and failing HTML.
 */

import { describe, it, expect } from 'vitest';
import { hasDoctype, hasXmlns, hasMetaCharset, hasMetaViewport, hasTitle, noScript, noExternalCss } from '../../src/lint/rules/structure.js';
import { tableHasRole, tableHasCellpadding, tableHasCellspacing, tableHasBorder } from '../../src/lint/rules/tables.js';
import { imgHasAlt, imgHasDisplayBlock, imgHasBorderZero, imgHasWidth } from '../../src/lint/rules/images.js';

// ===========================================================================
// Helpers
// ===========================================================================

/** Minimal valid email HTML skeleton that passes most rules. */
const VALID_EMAIL = [
  '<!DOCTYPE html>',
  '<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>Test</title>',
  '<style>@media only screen and (max-width:620px){.mc-responsive{width:100%!important;}}</style>',
  '<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->',
  '</head>',
  '<body>',
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">',
  '<tr><td>',
  '<img src="logo.png" alt="Logo" width="200" style="display:block;border:0;">',
  '<a href="https://example.com">Click here</a>',
  '</td></tr>',
  '</table>',
  '</body>',
  '</html>',
].join('\n');

// ===========================================================================
// Structure rules
// ===========================================================================

describe('has-doctype', () => {
  it('passes when DOCTYPE is present', () => {
    expect(hasDoctype.check('<!DOCTYPE html><html>')).toEqual([]);
  });

  it('passes with lowercase doctype', () => {
    expect(hasDoctype.check('<!doctype html><html>')).toEqual([]);
  });

  it('fails when DOCTYPE is missing', () => {
    const issues = hasDoctype.check('<html><head></head><body></body></html>');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('has-doctype');
    expect(issues[0]!.severity).toBe('error');
  });
});

describe('has-xmlns', () => {
  it('passes when xmlns is present', () => {
    expect(hasXmlns.check('<html xmlns="http://www.w3.org/1999/xhtml">')).toEqual([]);
  });

  it('fails when xmlns is missing', () => {
    const issues = hasXmlns.check('<html lang="en"><head></head></html>');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('has-xmlns');
    expect(issues[0]!.severity).toBe('error');
  });
});

describe('has-meta-charset', () => {
  it('passes when charset meta is present', () => {
    expect(hasMetaCharset.check('<head><meta charset="utf-8"></head>')).toEqual([]);
  });

  it('passes case-insensitively', () => {
    expect(hasMetaCharset.check('<head><meta charset="UTF-8"></head>')).toEqual([]);
  });

  it('fails when charset meta is missing', () => {
    const issues = hasMetaCharset.check('<head><meta name="viewport"></head>');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('has-meta-charset');
  });
});

describe('has-meta-viewport', () => {
  it('passes when viewport meta is present', () => {
    expect(hasMetaViewport.check('<head><meta name="viewport" content="width=device-width"></head>')).toEqual([]);
  });

  it('fails when viewport meta is missing', () => {
    const issues = hasMetaViewport.check('<head><meta charset="utf-8"></head>');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('has-meta-viewport');
  });
});

describe('has-title', () => {
  it('passes when title is present', () => {
    expect(hasTitle.check('<head><title>My Email</title></head>')).toEqual([]);
  });

  it('passes with empty title', () => {
    expect(hasTitle.check('<head><title></title></head>')).toEqual([]);
  });

  it('fails when title is missing', () => {
    const issues = hasTitle.check('<head><meta charset="utf-8"></head>');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('has-title');
    expect(issues[0]!.severity).toBe('warning');
  });
});

describe('no-script', () => {
  it('passes with no script tags', () => {
    expect(noScript.check('<html><body><p>Hello</p></body></html>')).toEqual([]);
  });

  it('fails when script tag is present', () => {
    const issues = noScript.check('<html><body><script>alert("xss")</script></body></html>');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('no-script');
    expect(issues[0]!.severity).toBe('error');
  });

  it('finds multiple script tags', () => {
    const html = '<script src="a.js"></script><p>text</p><script>code</script>';
    const issues = noScript.check(html);
    expect(issues).toHaveLength(2);
  });

  it('does not flag noscript tags', () => {
    expect(noScript.check('<noscript>Enable JS</noscript>')).toEqual([]);
  });
});

describe('no-external-css', () => {
  it('passes with inline styles only', () => {
    expect(noExternalCss.check('<style>body{margin:0;}</style>')).toEqual([]);
  });

  it('fails with external stylesheet', () => {
    const issues = noExternalCss.check('<link rel="stylesheet" href="styles.css">');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('no-external-css');
  });

  it('does not flag non-stylesheet links', () => {
    expect(noExternalCss.check('<link rel="icon" href="favicon.ico">')).toEqual([]);
  });
});

// ===========================================================================
// Table rules
// ===========================================================================

describe('table-has-role', () => {
  it('passes when role="presentation" is set', () => {
    expect(tableHasRole.check('<table role="presentation">')).toEqual([]);
  });

  it('fails when role is missing', () => {
    const issues = tableHasRole.check('<table cellpadding="0">');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('table-has-role');
    expect(issues[0]!.severity).toBe('warning');
  });

  it('reports each table individually', () => {
    const html = '<table><tr></tr></table><table role="presentation"></table><table></table>';
    const issues = tableHasRole.check(html);
    expect(issues).toHaveLength(2);
  });
});

describe('table-has-cellpadding', () => {
  it('passes when cellpadding="0" is set', () => {
    expect(tableHasCellpadding.check('<table cellpadding="0">')).toEqual([]);
  });

  it('fails when cellpadding is missing', () => {
    const issues = tableHasCellpadding.check('<table border="0">');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('table-has-cellpadding');
  });
});

describe('table-has-cellspacing', () => {
  it('passes when cellspacing="0" is set', () => {
    expect(tableHasCellspacing.check('<table cellspacing="0">')).toEqual([]);
  });

  it('fails when cellspacing is missing', () => {
    const issues = tableHasCellspacing.check('<table cellpadding="0">');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('table-has-cellspacing');
  });
});

describe('table-has-border', () => {
  it('passes when border="0" is set', () => {
    expect(tableHasBorder.check('<table border="0">')).toEqual([]);
  });

  it('fails when border is missing', () => {
    const issues = tableHasBorder.check('<table cellpadding="0">');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('table-has-border');
  });
});

// ===========================================================================
// Image rules
// ===========================================================================

describe('img-has-alt', () => {
  it('passes when alt is present', () => {
    expect(imgHasAlt.check('<img src="logo.png" alt="Logo">')).toEqual([]);
  });

  it('passes with empty alt (decorative)', () => {
    expect(imgHasAlt.check('<img src="dot.png" alt="">')).toEqual([]);
  });

  it('fails when alt is missing', () => {
    const issues = imgHasAlt.check('<img src="logo.png">');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('img-has-alt');
  });

  it('reports each image individually', () => {
    const html = '<img src="a.png"><img src="b.png" alt="B"><img src="c.png">';
    expect(imgHasAlt.check(html)).toHaveLength(2);
  });
});

describe('img-has-display-block', () => {
  it('passes when display:block is in style', () => {
    expect(imgHasDisplayBlock.check('<img style="display:block;" src="a.png">')).toEqual([]);
  });

  it('fails when display:block is missing', () => {
    const issues = imgHasDisplayBlock.check('<img style="border:0;" src="a.png">');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('img-has-display-block');
  });

  it('fails when no style at all', () => {
    const issues = imgHasDisplayBlock.check('<img src="a.png">');
    expect(issues).toHaveLength(1);
  });
});

describe('img-has-border-zero', () => {
  it('passes with border:0 in inline style', () => {
    expect(imgHasBorderZero.check('<img style="border:0;display:block;" src="a.png">')).toEqual([]);
  });

  it('passes with border="0" HTML attribute', () => {
    expect(imgHasBorderZero.check('<img border="0" src="a.png">')).toEqual([]);
  });

  it('fails when no border is set', () => {
    const issues = imgHasBorderZero.check('<img style="display:block;" src="a.png">');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('img-has-border-zero');
  });
});

describe('img-has-width', () => {
  it('passes when width attribute is present', () => {
    expect(imgHasWidth.check('<img width="200" src="a.png">')).toEqual([]);
  });

  it('fails when width attribute is missing', () => {
    const issues = imgHasWidth.check('<img src="a.png" alt="A">');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('img-has-width');
  });
});

// ===========================================================================
// Full valid email — smoke test
// ===========================================================================

describe('valid email smoke test', () => {
  it('valid email passes all basic structure/table/image rules', () => {
    const allRules = [
      hasDoctype, hasXmlns, hasMetaCharset, hasMetaViewport, hasTitle,
      noScript, noExternalCss,
      tableHasRole, tableHasCellpadding, tableHasCellspacing, tableHasBorder,
      imgHasAlt, imgHasDisplayBlock, imgHasBorderZero, imgHasWidth,
    ];
    const allIssues = allRules.flatMap((r) => r.check(VALID_EMAIL));
    expect(allIssues).toEqual([]);
  });
});
