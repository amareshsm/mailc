/**
 * Parity tests — `compileFromJSON()` templateStyle precedence and theme threading.
 *
 * Pins down two pieces of wiring that previously diverged from the markup path:
 *
 * 1. **templateStyle precedence**: `options.templateStyle ?? config.styling.templateStyle`,
 *    same as `compile()`. The JSON path used to silently default to `'attribute'`
 *    and ignore `config.styling.templateStyle` entirely — these tests would fail
 *    if that regression returned.
 *
 * 2. **theme threading**: `options.theme` is forwarded to `resolveTheme()`. The
 *    JSON path used to call `resolveTheme()` with no arguments, dropping user
 *    theme overrides on the floor.
 *
 * Each test isolates ONE behaviour with a single assertion focus.
 */

import { describe, it, expect } from 'vitest';
import { compileFromJSON } from '../../src/json/index.js';
import { mergeConfig } from '../../src/config.js';
import { ErrorCode } from '../../src/errors/codes.js';
import type { MCNode } from '../../src/json/schema.js';

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

/** Minimal tree containing a CSS-prop attr (`color`) on mc-text. */
function nodeWithCssPropAttr(): MCNode {
  return {
    type: 'mc',
    attributes: {},
    children: [{
      type: 'mc-body',
      attributes: {},
      children: [{
        type: 'mc-section',
        attributes: {},
        children: [{
          type: 'mc-column',
          attributes: {},
          children: [{ type: 'mc-text', attributes: { color: '#ff0000' }, content: 'Hi' }],
        }],
      }],
    }],
  };
}

/** Minimal tree with a Tailwind class that references a theme token. */
function nodeWithThemedClass(className: string): MCNode {
  return {
    type: 'mc',
    attributes: {},
    children: [{
      type: 'mc-body',
      attributes: {},
      children: [{
        type: 'mc-section',
        attributes: {},
        children: [{
          type: 'mc-column',
          attributes: {},
          children: [{
            type: 'mc-text',
            attributes: { class: className },
            content: 'Themed',
          }],
        }],
      }],
    }],
  };
}

const cssPropViolations = (result: ReturnType<typeof compileFromJSON>): typeof result.errors =>
  result.errors.filter((e) => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);

// ---------------------------------------------------------------------------
// templateStyle — default
// ---------------------------------------------------------------------------

describe('compileFromJSON — templateStyle default', () => {
  it('defaults to attribute mode (DEFAULT_CONFIG.styling.templateStyle = "attribute")', () => {
    // Default templateStyle is 'attribute' — CSS-property attrs are accepted
    // directly with no violations. compile() and compileFromJSON() both use
    // this default, so output is consistent across the two entry points.
    const result = compileFromJSON(nodeWithCssPropAttr());
    expect(cssPropViolations(result)).toHaveLength(0);
    expect(result.partial).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// templateStyle — explicit option
// ---------------------------------------------------------------------------

describe('compileFromJSON — templateStyle explicit option', () => {
  it('templateStyle:"attribute" suppresses violations', () => {
    const result = compileFromJSON(nodeWithCssPropAttr(), { templateStyle: 'attribute' });
    expect(cssPropViolations(result)).toHaveLength(0);
    expect(result.partial).toBe(false);
  });

  it('templateStyle:"class" produces violations (matches compile())', () => {
    const result = compileFromJSON(nodeWithCssPropAttr(), { templateStyle: 'class' });
    expect(cssPropViolations(result)).toHaveLength(1);
    expect(result.partial).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// templateStyle — config respected (the bug this file primarily guards)
// ---------------------------------------------------------------------------

describe('compileFromJSON — config.styling.templateStyle precedence', () => {
  it('config.styling.templateStyle:"attribute" is honored when no option override', () => {
    // Regression guard: the JSON path used to ignore config.styling.templateStyle
    // entirely and silently use 'attribute' as a hardcoded default. This pins
    // the fix — config now flows through the same precedence chain as compile().
    const result = compileFromJSON(nodeWithCssPropAttr(), {
      config: mergeConfig({ styling: { templateStyle: 'attribute' } }),
    });
    expect(cssPropViolations(result)).toHaveLength(0);
    expect(result.partial).toBe(false);
  });

  it('config.styling.templateStyle:"class" is honored when no option override', () => {
    const result = compileFromJSON(nodeWithCssPropAttr(), {
      config: mergeConfig({ styling: { templateStyle: 'class' } }),
    });
    expect(cssPropViolations(result)).toHaveLength(1);
    expect(result.partial).toBe(true);
  });

  it('options.templateStyle:"attribute" overrides config.styling.templateStyle:"class"', () => {
    const result = compileFromJSON(nodeWithCssPropAttr(), {
      templateStyle: 'attribute',
      config: mergeConfig({ styling: { templateStyle: 'class' } }),
    });
    expect(cssPropViolations(result)).toHaveLength(0);
  });

  it('options.templateStyle:"class" overrides config.styling.templateStyle:"attribute"', () => {
    const result = compileFromJSON(nodeWithCssPropAttr(), {
      templateStyle: 'class',
      config: mergeConfig({ styling: { templateStyle: 'attribute' } }),
    });
    expect(cssPropViolations(result)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// theme — options.theme is threaded into resolveTheme()
// ---------------------------------------------------------------------------

describe('compileFromJSON — options.theme is threaded through', () => {
  it('custom color token from options.theme.extend.colors resolves in class output', () => {
    // Regression guard: compileFromJSON used to call resolveTheme() with no
    // arguments, silently dropping options.theme. The custom 'brand' color
    // would not resolve and bg-brand would compile to nothing.
    const result = compileFromJSON(nodeWithThemedClass('text-brand'), {
      theme: { extend: { colors: { brand: '#e11d48' } } },
      templateStyle: 'class',
    });
    expect(result.errors).toHaveLength(0);
    assertDefined(result.html);
    expect(result.html).toContain('#e11d48');
  });

  it('custom spacing token from options.theme.extend.spacing resolves in class output', () => {
    const result = compileFromJSON(nodeWithThemedClass('p-72'), {
      theme: { extend: { spacing: { '72': '288px' } } },
      templateStyle: 'class',
    });
    expect(result.errors).toHaveLength(0);
    assertDefined(result.html);
    expect(result.html).toContain('288px');
  });

  it('without options.theme, custom token does NOT resolve (sanity)', () => {
    // Without the theme override, `text-brand` is not a valid token. The class
    // resolves to nothing and the hex '#e11d48' is absent from output.
    const result = compileFromJSON(nodeWithThemedClass('text-brand'));
    assertDefined(result.html);
    expect(result.html).not.toContain('#e11d48');
  });
});
