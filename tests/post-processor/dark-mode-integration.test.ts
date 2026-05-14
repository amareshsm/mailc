import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';

describe('Dark mode — compile() integration', () => {
  const darkModeConfig = {
    darkMode: {
      enabled: true,
      strategy: 'media-query' as const,
      colorMapping: {
        '#ffffff': '#1a1a1a',
        '#18181b': '#f5f5f5',
        '#e4e4e7': '#27272a',
      },
    },
  };

  // Dark-mode tests use CSS-property attributes (background-color, color) on mc-components.
  // These are attribute-mode tests by nature — we test dark mode rendering, not styling enforcement.
  const darkModeOpts = { config: darkModeConfig, templateStyle: 'attribute' as const };

  it('injects color-scheme meta tags into compiled output', () => {
    const result = compile(
      `<mc>
  <mc-body background-color="#ffffff"><mc-section><mc-column><mc-text>Hi</mc-text></mc-column></mc-section></mc-body>
</mc>`,
      darkModeOpts,
    );
    expect(result.html).not.toBeNull();
    expect(result.html!).toContain('<meta name="color-scheme" content="light dark">');
    expect(result.html!).toContain('<meta name="supported-color-schemes" content="light dark">');
  });

  it('adds dark mode classes to elements with mapped bg colors', () => {
    const result = compile(
      `<mc>
  <mc-body background-color="#ffffff"><mc-section background-color="#18181b"><mc-column><mc-text>Hello</mc-text></mc-column></mc-section></mc-body>
</mc>`,
      darkModeOpts,
    );
    expect(result.html).not.toBeNull();
    expect(result.html!).toContain('dm-bg-');
    expect(result.html!).toContain('@media(prefers-color-scheme:dark)');
  });

  it('adds dark mode classes for text color', () => {
    const result = compile(
      `<mc>
  <mc-body><mc-section><mc-column><mc-text color="#e4e4e7">Hello</mc-text></mc-column></mc-section></mc-body>
</mc>`,
      darkModeOpts,
    );
    expect(result.html).not.toBeNull();
    expect(result.html!).toContain('dm-c-');
  });

  it('does not break when dark mode is disabled (default)', () => {
    const result = compile(
      `<mc>
  <mc-body><mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section></mc-body>
</mc>`,
    );
    expect(result.html).not.toBeNull();
    expect(result.html!).not.toContain('color-scheme');
    expect(result.html!).not.toContain('prefers-color-scheme');
  });

  it('preserves light mode inline styles when dark mode enabled', () => {
    const result = compile(
      `<mc>
  <mc-body background-color="#ffffff"><mc-section background-color="#18181b"><mc-column><mc-text color="#e4e4e7">Hello</mc-text></mc-column></mc-section></mc-body>
</mc>`,
      darkModeOpts,
    );
    expect(result.html).not.toBeNull();
    // Light mode colors still present inline
    expect(result.html!).toContain('background-color:#18181b');
    expect(result.html!).toContain('#e4e4e7');
  });

  it('uses !important in dark mode overrides', () => {
    const result = compile(
      `<mc>
  <mc-body background-color="#ffffff"><mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section></mc-body>
</mc>`,
      darkModeOpts,
    );
    expect(result.html).not.toBeNull();
    if (result.html!.includes('@media(prefers-color-scheme:dark)')) {
      expect(result.html!).toContain('!important');
    }
  });

  it('produces zero errors with dark mode enabled', () => {
    const result = compile(
      `<mc>
  <mc-body><mc-section><mc-column><mc-text>Test</mc-text></mc-column></mc-section></mc-body>
</mc>`,
      { config: darkModeConfig, templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
  });

  it('works with empty colorMapping (meta-only mode)', () => {
    const result = compile(
      `<mc>
  <mc-body><mc-section><mc-column><mc-text>Hi</mc-text></mc-column></mc-section></mc-body>
</mc>`,
      { config: { darkMode: { enabled: true, strategy: 'media-query' as const, colorMapping: {} } } },
    );
    expect(result.html).not.toBeNull();
    expect(result.html!).toContain('color-scheme');
    expect(result.html!).not.toContain('@media(prefers-color-scheme:dark)');
  });
});
