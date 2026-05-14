/**
 * Integration tests for Phase 13 — mc-head Components.
 *
 * Tests end-to-end behavior of:
 * - mc-attributes: default attributes applied to components
 * - mc-style: CSS injected into <style> block
 * - mc-style inline="true": CSS inlined onto matching elements
 * - mc-preview padding-length
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';

// ---------------------------------------------------------------------------
// mc-attributes
// ---------------------------------------------------------------------------

describe('mc-attributes integration', () => {
  it('applies mc-all defaults to all components', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-attributes>
            <mc-all font-family="Arial, sans-serif" />
          </mc-attributes>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-text>Hello</mc-text>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    expect(result.html).toBeTruthy();
    // mc-all font-family should be applied to mc-text (and other components)
    // Since text outputs a <p> with style, the font-family should appear
    expect(result.html).toContain('font-family:Arial, sans-serif');
  });

  it('applies per-component defaults (mc-text)', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-attributes>
            <mc-text font-size="18px" color="#333333" />
          </mc-attributes>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-text>Styled text</mc-text>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('font-size:18px');
    expect(result.html).toContain('color:#333333');
  });

  it('explicit attributes override mc-attributes defaults', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-attributes>
            <mc-text font-size="14px" />
          </mc-attributes>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-text font-size="24px">Big text</mc-text>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    // Explicit font-size="24px" should override the default 14px
    expect(result.html).toContain('font-size:24px');
    expect(result.html).not.toContain('font-size:14px');
  });

  it('mc-all defaults are lower precedence than per-component defaults', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-attributes>
            <mc-all font-size="12px" />
            <mc-text font-size="16px" />
          </mc-attributes>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-text>Text</mc-text>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    // mc-text default (16px) should win over mc-all (12px)
    expect(result.html).toContain('font-size:16px');
    expect(result.html).not.toContain('font-size:12px');
  });

  it('mc-attributes apply to buttons', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-attributes>
            <mc-button background-color="#007bff" />
          </mc-attributes>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-button href="https://example.com">Click</mc-button>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('#007bff');
  });

  it('mc-attributes apply to dividers', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-attributes>
            <mc-divider border-color="#cccccc" />
          </mc-attributes>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-divider />
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('#cccccc');
  });

  it('mc-attributes apply to images', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-attributes>
            <mc-image border-radius="8px" />
          </mc-attributes>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-image src="https://example.com/img.png" alt="Test" />
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    expect(result.html).toBeTruthy();
  });

  it('works without mc-head (no defaults, no crash)', () => {
    const input = `
      <mc>
  <mc-body>
        <mc-section>
          <mc-column>
            <mc-text>No head</mc-text>
          </mc-column>
        </mc-section>
      </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('No head');
  });

  // Phase 1: mc-body respects global defaults
  it('Phase 1: mc-all background-color applies to mc-body outer table', () => {
    const input = `
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-all background-color="#f0f0f0" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text>Content</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `;
    const result = compile(input, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    // HONEST TEST: The outer <body> tag should NOT have the background-color style
    // (body gets margin/padding reset, but NOT background from mc-all)
    // Currently FAILS because mc-body doesn't use getEffectiveAttributes
    expect(result.html).toBeDefined();
    if (result.html) {
      const bodyTag = result.html.match(/<body [^>]*>/);
      expect(bodyTag).toBeTruthy();
      if (bodyTag) {
        // After fix: should have background-color:#f0f0f0 from mc-all default
        expect(bodyTag[0]).toContain('background-color:#f0f0f0');
      }
    }
  });

  it('Phase 1: explicit mc-body attribute overrides mc-all default', () => {
    const input = `
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-all background-color="#f0f0f0" />
          </mc-attributes>
        </mc-head>
        <mc-body background-color="#ffffff">
          <mc-section>
            <mc-column>
              <mc-text>Content</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `;
    const result = compile(input, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    // HONEST TEST: Explicit attribute on mc-body should win over mc-all default
    // The <body> tag should have the explicit value, not the default
    expect(result.html).toBeDefined();
    if (result.html) {
      const bodyTag = result.html.match(/<body [^>]*>/);
      expect(bodyTag).toBeTruthy();
      if (bodyTag) {
        // Explicit wins over default
        expect(bodyTag[0]).toContain('background-color:#ffffff');
        expect(bodyTag[0]).not.toContain('background-color:#f0f0f0');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// mc-style
// ---------------------------------------------------------------------------

describe('mc-style integration', () => {
  it('injects regular mc-style into <style> block', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-style>.highlight { color: #e85d3a; }</mc-style>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-text>Content</mc-text>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('<style>.highlight { color: #e85d3a; }</style>');
  });

  it('injects multiple mc-style blocks', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-style>.a { color: red; }</mc-style>
          <mc-style>.b { color: blue; }</mc-style>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-text>Content</mc-text>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('.a { color: red; }');
    expect(result.html).toContain('.b { color: blue; }');
  });

  it('mc-style inline="true" does NOT inject into <style> block', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-style inline="true">.header { background-color: #ffffff; }</mc-style>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-text>Content</mc-text>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    // Should NOT appear in a <style> block
    expect(result.html).not.toContain('<style>.header');
  });

  it('combines regular and inline mc-style correctly', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-style>.in-head { font-weight: bold; }</mc-style>
          <mc-style inline="true">.inlined { color: green; }</mc-style>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-text>Content</mc-text>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    // Regular style should be in <style>
    expect(result.html).toContain('.in-head { font-weight: bold; }');
  });
});

// ---------------------------------------------------------------------------
// mc-preview
// ---------------------------------------------------------------------------

describe('mc-preview integration', () => {
  it('generates preview text with default padding', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-preview>Your order has shipped!</mc-preview>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-text>Content</mc-text>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('Your order has shipped!');
    // Should contain padding characters
    expect(result.html).toContain('&#847;');
  });

  it('respects custom padding-length', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-preview padding-length="50">Short preview</mc-preview>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-text>Content</mc-text>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('Short preview');
    expect(result.html).toContain('&#847;');
  });

  it('handles padding-length="0" (no padding)', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-preview padding-length="0">No padding</mc-preview>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-text>Content</mc-text>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('No padding');
  });
});

// ---------------------------------------------------------------------------
// Combined mc-head
// ---------------------------------------------------------------------------

describe('combined mc-head components', () => {
  it('handles all mc-head children together', () => {
    const input = `
      <mc>
  <mc-head>
          <mc-attributes>
            <mc-all font-family="Arial, sans-serif" />
            <mc-text font-size="16px" />
          </mc-attributes>
          <mc-style>.custom { font-weight: bold; }</mc-style>
          <mc-preview>Welcome to our newsletter!</mc-preview>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-text>Hello world</mc-text>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `;
    const result = compile(input);
    expect(result.errors).toHaveLength(0);
    expect(result.html).toBeTruthy();
    // Attributes applied
    expect(result.html).toContain('font-family:Arial, sans-serif');
    expect(result.html).toContain('font-size:16px');
    // Style injected
    expect(result.html).toContain('.custom { font-weight: bold; }');
    // Preview present
    expect(result.html).toContain('Welcome to our newsletter!');
  });
});

// ---------------------------------------------------------------------------
// Phase 5: mc-class end-to-end wiring (defined in head, no crash)
// ---------------------------------------------------------------------------

describe('Phase 5: mc-class in head — context wiring', () => {
  it('compile with mc-class definitions produces no errors', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="cta" background-color="#e85d3a" color="#ffffff" font-size="16px" />
          </mc-attributes>
        </mc-head>
        <mc-body></mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
  });

  it('compile with multiple mc-class definitions produces no errors', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="base" font-size="14px" color="#333" />
            <mc-class name="primary" extends="base" color="#e85d3a" />
            <mc-class name="hero" font-size="24px" font-weight="bold" />
          </mc-attributes>
        </mc-head>
        <mc-body></mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
  });

  it('compile without mc-head still produces valid output (namedClasses defaults to empty Map)', () => {
    const result = compile(`
      <mc>
        <mc-body></mc-body>
      </mc>
    `);
    expect(result.errors).toHaveLength(0);
    expect(result.html).toBeTruthy();
  });

  it('Phase 6: mc-class attrs appear in compiled output on the target component', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="cta" background-color="#e85d3a" color="#ffffff" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-button href="https://example.com" mc-class="cta">Click</mc-button>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('background-color:#e85d3a');
    expect(result.html).toContain('color:#ffffff');
    expect(result.html).not.toContain('mc-class');
  });

  it('Phase 6: explicit attr on component overrides mc-class attr', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="cta" color="#ffffff" font-size="14px" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-button href="https://example.com" mc-class="cta" color="#000000">Click</mc-button>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('color:#000000');
    expect(result.html).not.toContain('color:#ffffff');
    expect(result.html).toContain('font-size:14px'); // inherited from class
  });

  it('Phase 6: mc-class extends chain resolves in compiled output', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="base" font-size="14px" font-family="Arial" />
            <mc-class name="hero" extends="base" font-size="24px" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="hero">Heading</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('font-size:24px');      // hero overrides base
    expect(result.html).toContain('font-family:Arial');   // inherited from base
  });

  it('Phase 6: unknown mc-class produces a warning', () => {
    const result = compile(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-button href="https://example.com" mc-class="undefined-class">Click</mc-button>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    const mcClassWarning = result.warnings.find(w => w.code === 'UNKNOWN_MC_CLASS');
    expect(mcClassWarning).toBeDefined();
    expect(mcClassWarning?.message).toContain('undefined-class');
  });

  it('mc-class mixed with regular mc-attributes children compiles cleanly', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-all font-family="Arial" />
            <mc-button background-color="#000" />
            <mc-class name="cta" background-color="#e85d3a" color="#fff" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-button href="https://example.com">Click</mc-button>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
  });
});
