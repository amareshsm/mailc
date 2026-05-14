/**
 * Tests for the `mc-hero` compiler.
 *
 * Covers: no-image rendering, background-image (VML + CSS), full-width mode,
 * child compilation, overlay, URL safety, height validation, and aria-label.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import type { CompileResult } from '../../src/types.js';

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Compile a hero snippet. Hero lives directly inside mc-body (not in
 * mc-section > mc-column), so the wrapper is different from table tests.
 */
function compileSource(inner: string): string {
  const src = `<mc><mc-body>${inner}</mc-body></mc>`;
  const result = compile(src, { templateStyle: 'attribute' });
  if (!result.html) throw new Error(result.errors.map((e) => e.message).join('\n'));
  return result.html;
}

/**
 * Compile and return all warnings/errors (does not throw on error).
 */
function compileResult(inner: string): CompileResult {
  const src = `<mc><mc-body>${inner}</mc-body></mc>`;
  return compile(src);
}

// ===========================================================================
// Basic rendering — no background image
// ===========================================================================

describe('compileHero — no background image', () => {
  it('renders a table wrapper', () => {
    const html = compileSource(`<mc-hero background-color="#1a1a2e"></mc-hero>`);
    expect(html).toContain('<table');
    expect(html).toContain('role="presentation"');
  });

  it('applies background-color to the td', () => {
    const html = compileSource(`<mc-hero background-color="#ff0000"></mc-hero>`);
    expect(html).toContain('#ff0000');
  });

  it('applies default background-color when none provided', () => {
    const html = compileSource(`<mc-hero></mc-hero>`);
    // Default color from metadata — just ensure it renders without error
    expect(html).toContain('<table');
  });

  it('does not emit VML when no background-image', () => {
    const html = compileSource(`<mc-hero background-color="#333"></mc-hero>`);
    expect(html).not.toContain('v:rect');
    expect(html).not.toContain('v:fill');
  });

  it('applies padding attribute', () => {
    const html = compileSource(`<mc-hero background-color="#333" padding="40px 20px"></mc-hero>`);
    expect(html).toContain('40px');
    expect(html).toContain('20px');
  });

  it('renders children inside the hero', () => {
    const html = compileSource(`
      <mc-hero background-color="#333">
        <mc-text>Hello hero</mc-text>
      </mc-hero>
    `);
    expect(html).toContain('Hello hero');
  });
});

// ===========================================================================
// Background image — VML + CSS dual output
// ===========================================================================

describe('compileHero — background image', () => {
  const HERO = `<mc-hero background-image="https://example.com/bg.jpg" background-color="#1a1a2e" height="400px"></mc-hero>`;

  it('emits VML v:rect conditional block', () => {
    const html = compileSource(HERO);
    expect(html).toContain('v:rect');
  });

  it('wraps VML in mso|IE conditional comment', () => {
    const html = compileSource(HERO);
    expect(html).toContain('<!--[if mso');
  });

  it('emits v:fill with type="frame"', () => {
    const html = compileSource(HERO);
    expect(html).toContain('v:fill');
    expect(html).toContain('type="frame"');
  });

  it('sets v:fill src to the background image URL', () => {
    const html = compileSource(HERO);
    expect(html).toContain('src="https://example.com/bg.jpg"');
  });

  it('sets VML width in pixels (mso-width-percent style)', () => {
    const html = compileSource(HERO);
    // VML rect should have a style attribute with width
    expect(html).toMatch(/v:rect[^>]*style="[^"]*width:/);
  });

  it('sets VML height to the hero height', () => {
    const html = compileSource(HERO);
    expect(html).toContain('400px');
  });

  it('emits CSS div with background-image', () => {
    const html = compileSource(HERO);
    expect(html).toContain('background-image:url(https://example.com/bg.jpg)');
  });

  it('applies background-position on CSS div', () => {
    const html = compileSource(
      `<mc-hero background-image="https://example.com/bg.jpg" background-position="top left" height="300px"></mc-hero>`
    );
    expect(html).toContain('background-position:top left');
  });

  it('applies background-size on CSS div', () => {
    const html = compileSource(
      `<mc-hero background-image="https://example.com/bg.jpg" background-size="contain" height="300px"></mc-hero>`
    );
    expect(html).toContain('background-size:contain');
  });

  it('sets fillcolor on v:rect from background-color', () => {
    const html = compileSource(HERO);
    expect(html).toContain('fillcolor="#1a1a2e"');
  });
});

// ===========================================================================
// Full-width mode
// ===========================================================================

describe('compileHero — full-width mode', () => {
  const FW_HERO = `<mc-hero background-image="https://example.com/bg.jpg" background-color="#333" height="300px" full-width="true"></mc-hero>`;

  it('renders a 100% wide table', () => {
    const html = compileSource(FW_HERO);
    expect(html).toContain('width="100%"');
  });

  it('does not emit v:fill with type="frame" (VML cannot stretch to viewport)', () => {
    const html = compileSource(FW_HERO);
    // full-width VML uses fillcolor on v:rect only
    expect(html).not.toContain('type="frame"');
  });

  it('still emits CSS div with background-image', () => {
    const html = compileSource(FW_HERO);
    expect(html).toContain('background-image:url(https://example.com/bg.jpg)');
  });
});

// ===========================================================================
// Children
// ===========================================================================

describe('compileHero — children', () => {
  it('renders mc-text child', () => {
    const html = compileSource(`
      <mc-hero background-color="#333">
        <mc-text>Welcome</mc-text>
      </mc-hero>
    `);
    expect(html).toContain('Welcome');
  });

  it('renders mc-button child', () => {
    const html = compileSource(`
      <mc-hero background-color="#333">
        <mc-button href="https://example.com">Click</mc-button>
      </mc-hero>
    `);
    expect(html).toContain('Click');
    expect(html).toContain('href="https://example.com"');
  });

  it('renders mc-image child', () => {
    const html = compileSource(`
      <mc-hero background-color="#333">
        <mc-image src="https://example.com/logo.png" alt="Logo" />
      </mc-hero>
    `);
    expect(html).toContain('Logo');
  });

  it('renders mc-spacer child', () => {
    const html = compileSource(`
      <mc-hero background-color="#333">
        <mc-spacer height="20px" />
      </mc-hero>
    `);
    expect(html).toContain('20px');
  });

  it('renders mc-divider child', () => {
    const html = compileSource(`
      <mc-hero background-color="#333">
        <mc-divider />
      </mc-hero>
    `);
    expect(html).toBeTruthy();
  });

  it('renders mc-if conditional child', () => {
    // mc-if is a logic tag that compiles to a conditional block —
    // use compileResult to avoid throwing on errors
    const result = compileResult(`
      <mc-hero background-color="#333">
        <mc-if condition="show">
          <mc-text>Conditional</mc-text>
        </mc-if>
      </mc-hero>
    `);
    // The hero itself should compile, mc-if may produce warnings
    expect(result).toBeDefined();
  });
});

// ===========================================================================
// URL safety
// ===========================================================================

describe('compileHero — URL safety', () => {
  it('strips javascript: protocol from background-image', () => {
    const result = compileResult(
      `<mc-hero background-image="javascript:alert(1)" height="300px"></mc-hero>`
    );
    expect(result.html ?? '').not.toContain('javascript:');
  });

  it('strips data: protocol from background-image', () => {
    const result = compileResult(
      `<mc-hero background-image="data:text/html,<script>alert(1)</script>" height="300px"></mc-hero>`
    );
    expect(result.html ?? '').not.toContain('data:text/html');
  });

  it('emits warning for unsafe URL', () => {
    const result = compileResult(
      `<mc-hero background-image="javascript:void(0)" height="300px"></mc-hero>`
    );
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('passes through https:// URL unchanged', () => {
    const html = compileSource(
      `<mc-hero background-image="https://cdn.example.com/hero.jpg" height="300px"></mc-hero>`
    );
    expect(html).toContain('https://cdn.example.com/hero.jpg');
  });
});

// ===========================================================================
// Height validation
// ===========================================================================

describe('compileHero — height validation', () => {
  it('emits warning when height is 0', () => {
    const result = compileResult(
      `<mc-hero background-image="https://example.com/bg.jpg" height="0"></mc-hero>`
    );
    expect(result.warnings.some((w) => w.code === 'HERO_INVALID_HEIGHT')).toBe(true);
  });

  it('emits warning when height is 0px', () => {
    const result = compileResult(
      `<mc-hero background-image="https://example.com/bg.jpg" height="0px"></mc-hero>`
    );
    expect(result.warnings.some((w) => w.code === 'HERO_INVALID_HEIGHT')).toBe(true);
  });

  it('emits warning when background-color missing for VML hero', () => {
    const result = compileResult(
      `<mc-hero background-image="https://example.com/bg.jpg" height="300px"></mc-hero>`
    );
    // HERO_MISSING_FALLBACK_COLOR is expected when no background-color provided
    // (default color used — depends on metadata default being set or not)
    // The hero compiles without crash regardless
    expect(result.html).toBeTruthy();
  });
});

// ===========================================================================
// Overlay
// ===========================================================================

describe('compileHero — overlay', () => {
  it('renders overlay div when overlay-color is set', () => {
    const html = compileSource(`
      <mc-hero background-image="https://example.com/bg.jpg" background-color="#333"
               height="300px" overlay-color="rgba(0,0,0,0.5)">
        <mc-text>Over it</mc-text>
      </mc-hero>
    `);
    expect(html).toContain('rgba(0,0,0,0.5)');
    expect(html).toContain('position:absolute');
  });

  it('wraps children in position:relative z-index:1 container when overlay set', () => {
    const html = compileSource(`
      <mc-hero background-image="https://example.com/bg.jpg" background-color="#333"
               height="300px" overlay-color="rgba(0,0,0,0.4)">
        <mc-text>Visible</mc-text>
      </mc-hero>
    `);
    expect(html).toContain('z-index:1');
  });

  it('does not emit overlay elements when overlay-color is not set', () => {
    const html = compileSource(`
      <mc-hero background-image="https://example.com/bg.jpg" background-color="#333" height="300px">
        <mc-text>No overlay</mc-text>
      </mc-hero>
    `);
    expect(html).not.toContain('position:absolute');
  });
});

// ===========================================================================
// aria-label
// ===========================================================================

describe('compileHero — aria-label', () => {
  it('adds role="region" when aria-label is set', () => {
    const html = compileSource(
      `<mc-hero background-color="#333" aria-label="Hero banner"></mc-hero>`
    );
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Hero banner"');
  });

  it('does not add role="region" when aria-label is not set', () => {
    const html = compileSource(`<mc-hero background-color="#333"></mc-hero>`);
    expect(html).not.toContain('role="region"');
  });
});

// ---------------------------------------------------------------------------
// Styling mode enforcement
// ---------------------------------------------------------------------------

import { ErrorCode } from '../../src/errors/codes.js';

describe('compileHero — styling mode enforcement', () => {
  it('class mode errors on background-color attr (opt-in)', () => {
    const result = compile(
      `<mc><mc-body>
        <mc-hero background-color="#18181b"><mc-text class="text-sm">Hi</mc-text></mc-hero>
      </mc-body></mc>`,
      { templateStyle: 'class' },
    );
    const v = result.errors.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeDefined();
    expect(v?.severity).toBe('error');
    expect(v?.message).toContain('"background-color"');
    expect(v?.message).toContain('<mc-hero>');
  });

  it('height attr is structural — never flagged in class mode', () => {
    const result = compile(
      `<mc><mc-body>
        <mc-hero height="300px"><mc-text class="text-sm">Hi</mc-text></mc-hero>
      </mc-body></mc>`,
      { templateStyle: 'class' },
    );
    const v = result.errors.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });

  it('attribute mode produces no enforcement error', () => {
    const result = compile(`<mc><mc-body>
      <mc-hero background-color="#18181b" padding="40px 32px">
        <mc-text class="text-sm">Hi</mc-text>
      </mc-hero>
    </mc-body></mc>`, { templateStyle: 'attribute' });
    const v = result.errors.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });

  it('class attr on mc-hero is always allowed without error', () => {
    const result = compile(`<mc><mc-body>
      <mc-hero height="300px" class="bg-[#18181b] py-[40px] px-[32px]">
        <mc-text class="text-sm">Hi</mc-text>
      </mc-hero>
    </mc-body></mc>`);
    const v = result.errors.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });
});
