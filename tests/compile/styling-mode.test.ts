/**
 * Integration tests for the templateStyle compile option.
 *
 * Default templateStyle is `'attribute'` — CSS-property attributes are
 * accepted directly. These tests opt into `'class'` (limited support)
 * to verify that class-mode enforcement still works correctly when
 * a project explicitly chooses it.
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { DEFAULT_CONFIG, mergeConfig } from '../../src/config.js';
import { ErrorCode } from '../../src/errors/codes.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MINIMAL = (inner: string): string =>
  `<mc><mc-body><mc-section><mc-column>${inner}</mc-column></mc-section></mc-body></mc>`;

/**
 * Compile in class mode and return CSS_ATTR_IN_CLASS_MODE violations.
 * Caller may override `templateStyle` if a specific test needs attribute mode.
 */
function classViolations(source: string, opts?: Parameters<typeof compile>[1]): ReturnType<typeof compile>['errors'] {
  return compile(source, { templateStyle: 'class', ...opts }).errors.filter(
    (e) => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE,
  );
}

// ---------------------------------------------------------------------------
// Class mode (limited support) — explicit opt-in
// ---------------------------------------------------------------------------

describe('templateStyle — class mode (limited support, explicit opt-in)', () => {
  it('CSS-prop attr on mc-text produces CSS_ATTR_IN_CLASS_MODE in result.errors', () => {
    const source = MINIMAL('<mc-text color="#333333">Hello</mc-text>');
    const violations = classViolations(source);
    expect(violations).toHaveLength(1);
    const firstViolation = violations[0];
    expect(firstViolation).toBeDefined();
    if (firstViolation) {
      expect(firstViolation.severity).toBe('error');
    }
  });

  it('explicit templateStyle:"class" produces violations consistent with the helper', () => {
    const source = MINIMAL('<mc-text color="#333333">Hi</mc-text>');
    const helperViolations = classViolations(source);
    const explicitViolations = classViolations(source, { templateStyle: 'class' });
    expect(explicitViolations).toHaveLength(helperViolations.length);
  });

  it('compilation fails (partial:true) when violations are present', () => {
    const source = MINIMAL('<mc-text color="#ff0000">Red</mc-text>');
    const result = compile(source, { templateStyle: 'class' });
    const violations = result.errors.filter(e => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toBeDefined();
    expect(result.html).not.toBeNull();
    expect(result.html).toContain('Red');
    expect(result.partial).toBe(true);
  });

  it('banned CSS-prop attr is stripped from output in class mode', () => {
    const source = MINIMAL('<mc-text color="#0000ff">Blue</mc-text>');
    const result = compile(source, { templateStyle: 'class' });
    // Problem 2 fix: banned attrs are stripped from HTML output in class mode
    expect(result.html).not.toContain('color:#0000ff');
  });
});

// ---------------------------------------------------------------------------
// Attribute mode suppresses enforcement
// ---------------------------------------------------------------------------

describe('templateStyle — attribute mode', () => {
  it('CSS-prop attr produces no CSS_ATTR_IN_CLASS_MODE warning', () => {
    const source = MINIMAL('<mc-text color="#333333">Hello</mc-text>');
    const violations = classViolations(source, { templateStyle: 'attribute' });
    expect(violations).toHaveLength(0);
  });

  it('multiple CSS-prop attrs produce no warnings in attribute mode', () => {
    const source = MINIMAL(
      '<mc-text color="#333" font-size="14px" padding="8px">Hi</mc-text>',
    );
    const violations = classViolations(source, { templateStyle: 'attribute' });
    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Structural attrs are always allowed
// ---------------------------------------------------------------------------

describe('templateStyle — structural attrs always allowed', () => {
  it('width on mc-column is not flagged in class mode', () => {
    const source = `<mc><mc-body>
      <mc-section>
        <mc-column width="50%"><mc-text class="text-sm">Hi</mc-text></mc-column>
      </mc-section>
    </mc-body></mc>`;
    const violations = classViolations(source);
    expect(violations).toHaveLength(0);
  });

  it('height on mc-hero is not flagged in class mode', () => {
    const source = `<mc><mc-body>
      <mc-hero height="300px"><mc-text class="text-sm">Hi</mc-text></mc-hero>
    </mc-body></mc>`;
    const violations = classViolations(source);
    expect(violations).toHaveLength(0);
  });

  it('href on mc-button is not flagged in class mode', () => {
    const source = MINIMAL(
      '<mc-button href="https://example.com" class="bg-black text-white py-3 px-6">Buy</mc-button>',
    );
    const violations = classViolations(source);
    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// class="" is always allowed
// ---------------------------------------------------------------------------

describe('templateStyle — class attribute is always allowed', () => {
  it('Tailwind class on mc-text produces no warning', () => {
    const source = MINIMAL('<mc-text class="text-[#333] text-base leading-6">Hi</mc-text>');
    const violations = classViolations(source);
    expect(violations).toHaveLength(0);
  });

  it('Tailwind class on mc-section produces no warning', () => {
    const source = `<mc><mc-body>
      <mc-section class="bg-gray-100 py-8 px-6"><mc-column>
        <mc-text class="text-sm">Hi</mc-text>
      </mc-column></mc-section>
    </mc-body></mc>`;
    const violations = classViolations(source);
    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// mc-attributes is exempt
// ---------------------------------------------------------------------------

describe('templateStyle — mc-attributes is exempt', () => {
  it('font-family in mc-attributes does not trigger a warning in class mode', () => {
    const source = `<mc>
      <mc-head>
        <mc-attributes>
          <mc-all font-family="'Helvetica Neue', Arial, sans-serif" />
        </mc-attributes>
      </mc-head>
      <mc-body><mc-section><mc-column>
        <mc-text class="text-sm">Hi</mc-text>
      </mc-column></mc-section></mc-body>
    </mc>`;
    const violations = classViolations(source);
    expect(violations).toHaveLength(0);
  });

  it('color in mc-attributes does not trigger a warning in class mode', () => {
    const source = `<mc>
      <mc-head>
        <mc-attributes><mc-text color="#1a1a1a" /></mc-attributes>
      </mc-head>
      <mc-body><mc-section><mc-column>
        <mc-text class="text-sm">Hi</mc-text>
      </mc-column></mc-section></mc-body>
    </mc>`;
    const violations = classViolations(source);
    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Error message quality
// ---------------------------------------------------------------------------

describe('templateStyle — error message content', () => {
  it('message names the attribute and the component', () => {
    const source = MINIMAL('<mc-text color="#ff0000">Red</mc-text>');
    const violations = classViolations(source);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toBeDefined();
    if (violations[0]) {
      expect(violations[0].message).toContain('"color"');
      expect(violations[0].message).toContain('<mc-text>');
    }
  });

  it('message contains a class= hint', () => {
    const source = MINIMAL('<mc-text color="#ff0000">Red</mc-text>');
    const violations = classViolations(source);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toBeDefined();
    if (violations[0]) {
      expect(violations[0].message).toContain('class=');
    }
  });

  it('fix field contains the class replacement hint', () => {
    const source = MINIMAL('<mc-text color="#ff0000">Red</mc-text>');
    const violations = classViolations(source);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toBeDefined();
    if (violations[0]) {
      expect(violations[0].fix).toBeDefined();
      expect(violations[0].fix).toContain('class=');
    }
  });

  it('message mentions templateStyle:attribute opt-out', () => {
    const source = MINIMAL('<mc-text color="#ff0000">Red</mc-text>');
    const violations = classViolations(source);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toBeDefined();
    if (violations[0]) {
      expect(violations[0].message).toContain("templateStyle: 'attribute'");
    }
  });

  it('each CSS-prop attr produces a separate violation', () => {
    const source = MINIMAL(
      '<mc-text color="#333" font-size="14px" padding="8px">Multi</mc-text>',
    );
    const violations = classViolations(source);
    expect(violations).toHaveLength(3);
    const attrs = violations.map((v) => {
      const m = v.message.match(/"([^"]+)"/);
      return m ? m[1] : '';
    });
    expect(attrs).toContain('color');
    expect(attrs).toContain('font-size');
    expect(attrs).toContain('padding');
  });
});

// ---------------------------------------------------------------------------
// Config and option precedence
// ---------------------------------------------------------------------------

describe('templateStyle — config and option precedence', () => {
  it('DEFAULT_CONFIG.styling.templateStyle is "attribute"', () => {
    expect(DEFAULT_CONFIG.styling.templateStyle).toBe('attribute');
  });

  it('config.styling.templateStyle:"attribute" suppresses violations', () => {
    const source = MINIMAL('<mc-text color="#333333">Hello</mc-text>');
    // Bypass the classViolations helper (which injects templateStyle:'class' as a direct
    // option) so we can verify the config-only path. Direct options override config.
    const violations = compile(source, {
      config: mergeConfig({ styling: { templateStyle: 'attribute' } }),
    }).errors.filter((e) => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(violations).toHaveLength(0);
  });

  it('CompileOptions.templateStyle:"class" overrides config.styling.templateStyle:"attribute"', () => {
    const source = MINIMAL('<mc-text color="#333333">Hello</mc-text>');
    const violations = classViolations(source, {
      templateStyle: 'class',
      config: mergeConfig({ styling: { templateStyle: 'attribute' } }),
    });
    expect(violations).toHaveLength(1);
  });

  it('CompileOptions.templateStyle:"attribute" overrides config.styling.templateStyle:"class"', () => {
    const source = MINIMAL('<mc-text color="#333333">Hello</mc-text>');
    const violations = classViolations(source, {
      templateStyle: 'attribute',
      config: mergeConfig({ styling: { templateStyle: 'class' } }),
    });
    expect(violations).toHaveLength(0);
  });

  it('mergeConfig preserves styling.templateStyle when not overridden', () => {
    // Override an unrelated config slice; styling.templateStyle should
    // survive untouched. (`width` is an arbitrary unrelated scalar.)
    const cfg = mergeConfig({ width: 700 });
    expect(cfg.styling.templateStyle).toBe('attribute');
  });

  it('mergeConfig correctly overrides styling.templateStyle', () => {
    const cfg = mergeConfig({ styling: { templateStyle: 'attribute' } });
    expect(cfg.styling.templateStyle).toBe('attribute');
  });
});

// ---------------------------------------------------------------------------
// Component coverage — each enforced component produces violations
// ---------------------------------------------------------------------------

describe('templateStyle — enforcement across all mc-components', () => {
  it('mc-text: color attr is flagged', () => {
    const v = classViolations(MINIMAL('<mc-text color="#000">Hi</mc-text>'));
    expect(v.length).toBeGreaterThan(0);
  });

  it('mc-button: background-color attr is flagged', () => {
    const v = classViolations(
      MINIMAL('<mc-button href="#" background-color="#000">Buy</mc-button>'),
    );
    expect(v.length).toBeGreaterThan(0);
  });

  it('mc-section: background-color attr is flagged', () => {
    const source = `<mc><mc-body>
      <mc-section background-color="#ffffff"><mc-column>
        <mc-text class="text-sm">Hi</mc-text>
      </mc-column></mc-section>
    </mc-body></mc>`;
    const v = classViolations(source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('mc-column: background-color attr is flagged', () => {
    const source = `<mc><mc-body>
      <mc-section><mc-column background-color="#fff">
        <mc-text class="text-sm">Hi</mc-text>
      </mc-column></mc-section>
    </mc-body></mc>`;
    const v = classViolations(source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('mc-divider: border-color attr is flagged', () => {
    const v = classViolations(MINIMAL('<mc-divider border-color="#e0e0e0" />'));
    expect(v.length).toBeGreaterThan(0);
  });

  it('mc-spacer: height attr is flagged', () => {
    const v = classViolations(MINIMAL('<mc-spacer height="24px" />'));
    expect(v.length).toBeGreaterThan(0);
  });

  it('mc-body: background-color attr is flagged', () => {
    const source = `<mc><mc-body background-color="#f5f5f5">
      <mc-section><mc-column><mc-text class="text-sm">Hi</mc-text></mc-column></mc-section>
    </mc-body></mc>`;
    const v = classViolations(source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('mc-hero: background-color attr is flagged', () => {
    const source = `<mc><mc-body>
      <mc-hero background-color="#18181b"><mc-text class="text-sm">Hi</mc-text></mc-hero>
    </mc-body></mc>`;
    const v = classViolations(source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('mc-image: border-radius attr is flagged', () => {
    const v = classViolations(
      MINIMAL('<mc-image src="img.jpg" alt="test" width="600" border-radius="8px" />'),
    );
    expect(v.length).toBeGreaterThan(0);
  });

  it('mc-image: border attr is flagged in class mode', () => {
    const v = classViolations(
      MINIMAL('<mc-image src="img.jpg" alt="test" width="600" border="1px solid #e0e0e0" />'),
    );
    expect(v.length).toBeGreaterThan(0);
  });

  it('mc-image: border attr is stripped from HTML in class mode', () => {
    const source = MINIMAL(
      '<mc-image src="img.jpg" alt="test" width="600" border="1px solid #e0e0e0" />',
    );
    const result = compile(source, { templateStyle: 'class' });
    expect(result.html).not.toContain('border:1px solid #e0e0e0');
    expect(result.html).not.toContain('border="1px solid #e0e0e0"');
  });

  it('mc-image: border attr is allowed in attribute mode', () => {
    const source = MINIMAL(
      '<mc-image src="img.jpg" alt="test" width="600" border="1px solid #e0e0e0" />',
    );
    const v = classViolations(source, { templateStyle: 'attribute' });
    expect(v).toHaveLength(0);
    const result = compile(source, { templateStyle: 'attribute' });
    expect(result.html).toContain('1px solid #e0e0e0');
  });

  it('mc-image: border via mc-attributes default is exempt in class mode', () => {
    const source = `<mc>
      <mc-head>
        <mc-attributes>
          <mc-image border="1px solid #e0e0e0" />
        </mc-attributes>
      </mc-head>
      <mc-body><mc-section><mc-column>
        <mc-image src="img.jpg" alt="test" width="600" />
      </mc-column></mc-section></mc-body>
    </mc>`;
    const v = classViolations(source);
    expect(v).toHaveLength(0);
  });
});
