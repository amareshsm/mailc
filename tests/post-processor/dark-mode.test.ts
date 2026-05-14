import { describe, it, expect } from 'vitest';
import { applyDarkMode } from '../../src/post-processor/dark-mode.js';
import type { DarkModeConfig } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a DarkModeConfig with defaults. */
function makeConfig(overrides: Partial<DarkModeConfig> = {}): DarkModeConfig {
  return {
    enabled: false,
    strategy: 'media-query',
    colorMapping: {},
    ...overrides,
  };
}

/** Minimal valid email HTML shell for testing. */
function wrapHtml(body: string): string {
  return (
    `<html><head><meta charset="utf-8"><style>body{margin:0;}</style></head>` +
    `<body>${body}</body></html>`
  );
}

// ---------------------------------------------------------------------------
// Tests: disabled state
// ---------------------------------------------------------------------------

describe('applyDarkMode — disabled', () => {
  it('returns HTML unchanged when enabled is false', () => {
    const html = wrapHtml('<td style="background-color:#ffffff;">Hi</td>');
    const result = applyDarkMode(html, makeConfig({ enabled: false }));
    expect(result.html).toBe(html);
  });

  it('does not inject meta tags when disabled', () => {
    const html = wrapHtml('<p>Hello</p>');
    const result = applyDarkMode(html, makeConfig({ enabled: false }));
    expect(result.html).not.toContain('color-scheme');
  });
});

// ---------------------------------------------------------------------------
// Tests: meta tag injection (layer 2)
// ---------------------------------------------------------------------------

describe('applyDarkMode — meta tags', () => {
  it('injects color-scheme meta tags when enabled', () => {
    const html = wrapHtml('<p>Hello</p>');
    const result = applyDarkMode(html, makeConfig({ enabled: true }));
    expect(result.html).toContain('<meta name="color-scheme" content="light dark">');
    expect(result.html).toContain('<meta name="supported-color-schemes" content="light dark">');
  });

  it('injects meta tags even with empty colorMapping', () => {
    const html = wrapHtml('<p>Hello</p>');
    const result = applyDarkMode(html, makeConfig({ enabled: true, colorMapping: {} }));
    expect(result.html).toContain('color-scheme');
  });

  it('places meta tags before </head>', () => {
    const html = wrapHtml('<p>Hello</p>');
    const result = applyDarkMode(html, makeConfig({ enabled: true }));
    const headClose = result.html.indexOf('</head>');
    const metaPos = result.html.indexOf('<meta name="color-scheme"');
    expect(metaPos).toBeGreaterThan(-1);
    expect(metaPos).toBeLessThan(headClose);
  });
});

// ---------------------------------------------------------------------------
// Tests: background-color mapping (layer 3)
// ---------------------------------------------------------------------------

describe('applyDarkMode — background-color mapping', () => {
  const config = makeConfig({
    enabled: true,
    colorMapping: { '#ffffff': '#1a1a1a' },
  });

  it('adds dark-mode class to elements with mapped background-color', () => {
    const html = wrapHtml('<td style="background-color:#ffffff;padding:8px;">Hi</td>');
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('class="dm-bg-0"');
  });

  it('generates @media(prefers-color-scheme:dark) block', () => {
    const html = wrapHtml('<td style="background-color:#ffffff;">Hi</td>');
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('@media(prefers-color-scheme:dark)');
    expect(result.html).toContain('.dm-bg-0{background-color:#1a1a1a!important;}');
  });

  it('wraps @media block in <style> tag', () => {
    const html = wrapHtml('<td style="background-color:#ffffff;">Hi</td>');
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('<style>@media(prefers-color-scheme:dark)');
  });

  it('does not modify inline style value (light mode intact)', () => {
    const html = wrapHtml('<td style="background-color:#ffffff;">Hi</td>');
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('background-color:#ffffff;');
  });

  it('handles multiple elements with same color', () => {
    const html = wrapHtml(
      '<td style="background-color:#ffffff;">A</td>' +
      '<td style="background-color:#ffffff;">B</td>',
    );
    const result = applyDarkMode(html, config);
    // Both get the class
    const matches = result.html.match(/dm-bg-0/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
    // Only one @media rule (not duplicated)
    const ruleMatches = result.html.match(/\.dm-bg-0\{/g);
    expect(ruleMatches).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: color (text) mapping
// ---------------------------------------------------------------------------

describe('applyDarkMode — color mapping', () => {
  const config = makeConfig({
    enabled: true,
    colorMapping: { '#1a1a1a': '#e4e4e7' },
  });

  it('adds dark-mode class for text color', () => {
    const html = wrapHtml('<p style="color:#1a1a1a;">Hello</p>');
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('class="dm-c-0"');
  });

  it('generates correct @media rule for color', () => {
    const html = wrapHtml('<p style="color:#1a1a1a;">Hello</p>');
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('.dm-c-0{color:#e4e4e7!important;}');
  });
});

// ---------------------------------------------------------------------------
// Tests: multiple color mappings
// ---------------------------------------------------------------------------

describe('applyDarkMode — multiple mappings', () => {
  const config = makeConfig({
    enabled: true,
    colorMapping: {
      '#ffffff': '#1a1a1a',
      '#f3f4f6': '#27272a',
      '#1a1a1a': '#e4e4e7',
    },
  });

  it('assigns different class indices per color', () => {
    const html = wrapHtml(
      '<td style="background-color:#ffffff;">A</td>' +
      '<td style="background-color:#f3f4f6;">B</td>',
    );
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('dm-bg-0');
    expect(result.html).toContain('dm-bg-1');
  });

  it('handles both bg and text colors in same element', () => {
    const html = wrapHtml(
      '<td style="background-color:#ffffff;color:#1a1a1a;">Hi</td>',
    );
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('dm-bg-0');
    // #1a1a1a is the 3rd entry in the mapping (index 2)
    expect(result.html).toContain('dm-c-2');
  });

  it('generates @media block with all rules', () => {
    const html = wrapHtml(
      '<td style="background-color:#ffffff;color:#1a1a1a;">Hi</td>' +
      '<td style="background-color:#f3f4f6;">There</td>',
    );
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('.dm-bg-0{background-color:#1a1a1a!important;}');
    expect(result.html).toContain('.dm-bg-1{background-color:#27272a!important;}');
    // #1a1a1a is the 3rd mapping entry → dm-c-2
    expect(result.html).toContain('.dm-c-2{color:#e4e4e7!important;}');
  });
});

// ---------------------------------------------------------------------------
// Tests: case insensitivity
// ---------------------------------------------------------------------------

describe('applyDarkMode — case insensitivity', () => {
  it('matches uppercase hex in mapping against lowercase in HTML', () => {
    const config = makeConfig({
      enabled: true,
      colorMapping: { '#FFFFFF': '#1a1a1a' },
    });
    const html = wrapHtml('<td style="background-color:#ffffff;">Hi</td>');
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('dm-bg-0');
  });

  it('matches lowercase hex in mapping against uppercase in HTML', () => {
    const config = makeConfig({
      enabled: true,
      colorMapping: { '#ffffff': '#1a1a1a' },
    });
    const html = wrapHtml('<td style="background-color:#FFFFFF;">Hi</td>');
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('dm-bg-0');
  });
});

// ---------------------------------------------------------------------------
// Tests: no match (unmapped colors ignored)
// ---------------------------------------------------------------------------

describe('applyDarkMode — unmapped colors', () => {
  const config = makeConfig({
    enabled: true,
    colorMapping: { '#ffffff': '#1a1a1a' },
  });

  it('does not add class for unmapped color', () => {
    const html = wrapHtml('<td style="background-color:#f0f0f0;">Hi</td>');
    const result = applyDarkMode(html, config);
    expect(result.html).not.toContain('dm-bg');
  });

  it('does not generate @media block when no colors match', () => {
    const html = wrapHtml('<td style="background-color:#f0f0f0;">Hi</td>');
    const result = applyDarkMode(html, config);
    expect(result.html).not.toContain('@media(prefers-color-scheme:dark)');
    // But still has meta tags
    expect(result.html).toContain('color-scheme');
  });
});

// ---------------------------------------------------------------------------
// Tests: existing class attribute
// ---------------------------------------------------------------------------

describe('applyDarkMode — existing class attributes', () => {
  const config = makeConfig({
    enabled: true,
    colorMapping: { '#ffffff': '#1a1a1a' },
  });

  it('appends to existing class attribute', () => {
    const html = wrapHtml(
      '<div class="mc-responsive" style="background-color:#ffffff;">Hi</div>',
    );
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('class="mc-responsive dm-bg-0"');
  });

  it('does not duplicate class if already present', () => {
    const html = wrapHtml(
      '<div class="dm-bg-0" style="background-color:#ffffff;">Hi</div>',
    );
    const result = applyDarkMode(html, config);
    const matches = result.html.match(/dm-bg-0/g);
    // class attr + @media rule = 2 occurrences (not 3)
    expect(matches!.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Tests: edge cases
// ---------------------------------------------------------------------------

describe('applyDarkMode — edge cases', () => {
  it('handles HTML with no style attributes', () => {
    const html = wrapHtml('<p>Hello world</p>');
    const config = makeConfig({
      enabled: true,
      colorMapping: { '#ffffff': '#1a1a1a' },
    });
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('color-scheme');
    expect(result.html).not.toContain('@media(prefers-color-scheme');
  });

  it('handles color values with spaces around colon', () => {
    const html = wrapHtml('<td style="background-color: #ffffff;">Hi</td>');
    const config = makeConfig({
      enabled: true,
      colorMapping: { '#ffffff': '#1a1a1a' },
    });
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('dm-bg-0');
  });

  it('handles color as last property in style (no trailing semicolon)', () => {
    const html = wrapHtml('<td style="padding:8px;background-color:#ffffff">Hi</td>');
    const config = makeConfig({
      enabled: true,
      colorMapping: { '#ffffff': '#1a1a1a' },
    });
    const result = applyDarkMode(html, config);
    expect(result.html).toContain('dm-bg-0');
  });

  it('handles empty HTML gracefully', () => {
    const result = applyDarkMode('', makeConfig({ enabled: true }));
    expect(result.html).toBe('');
  });

  it('handles HTML without </head>', () => {
    const html = '<body><td style="background-color:#ffffff;">Hi</td></body>';
    const config = makeConfig({
      enabled: true,
      colorMapping: { '#ffffff': '#1a1a1a' },
    });
    const result = applyDarkMode(html, config);
    // Classes still added, but no meta/style injection
    expect(result.html).toContain('dm-bg-0');
  });
});

// ---------------------------------------------------------------------------
// Tests: integration with compile pipeline
// ---------------------------------------------------------------------------

describe('applyDarkMode — integration', () => {
  it('preserves all existing HTML structure', () => {
    const html = wrapHtml(
      '<table role="presentation" border="0" cellpadding="0">' +
      '<tr><td style="background-color:#ffffff;color:#1a1a1a;padding:16px;">Content</td></tr>' +
      '</table>',
    );
    const config = makeConfig({
      enabled: true,
      colorMapping: { '#ffffff': '#1a1a1a', '#1a1a1a': '#e4e4e7' },
    });
    const result = applyDarkMode(html, config);

    // Original structure preserved
    expect(result.html).toContain('role="presentation"');
    expect(result.html).toContain('border="0"');
    expect(result.html).toContain('cellpadding="0"');
    expect(result.html).toContain('padding:16px;');

    // Dark mode additions
    expect(result.html).toContain('color-scheme');
    expect(result.html).toContain('@media(prefers-color-scheme:dark)');
    expect(result.html).toContain('dm-bg-0');
    // #1a1a1a is the 2nd mapping entry → dm-c-1
    expect(result.html).toContain('dm-c-1');
  });
});
