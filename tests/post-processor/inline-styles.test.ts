/**
 * Tests for the inline-styles post-processor.
 *
 * Tests `applyInlineStyleRules()` which applies mc-style inline="true"
 * rules to matching HTML elements by class name.
 */
import { describe, it, expect } from 'vitest';
import { applyInlineStyleRules } from '../../src/post-processor/inline-styles.js';
import type { CompileContext } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal CompileContext with the given inline style rules.
 */
function makeContextWithRules(
  rules: CompileContext['inlineStyleRules'],
): CompileContext {
  return {
    inlineStyleRules: rules,
    // Only inlineStyleRules is needed for the function under test
  } as unknown as CompileContext;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('applyInlineStyleRules', () => {
  it('returns html unchanged when no rules', () => {
    const html = '<div class="header">Hello</div>';
    const ctx = makeContextWithRules([]);
    expect(applyInlineStyleRules(html, ctx)).toBe(html);
  });

  it('injects styles for matching class selector', () => {
    const html = '<div class="header">Hello</div>';
    const ctx = makeContextWithRules([
      { selector: '.header', declarations: { color: 'red' } },
    ]);
    const result = applyInlineStyleRules(html, ctx);
    expect(result).toContain('style="color:red"');
  });

  it('merges styles with existing style attribute', () => {
    const html = '<div class="header" style="font-size:16px">Hello</div>';
    const ctx = makeContextWithRules([
      { selector: '.header', declarations: { color: 'red' } },
    ]);
    const result = applyInlineStyleRules(html, ctx);
    expect(result).toContain('color:red');
    expect(result).toContain('font-size:16px');
  });

  it('existing inline styles take precedence', () => {
    const html = '<div class="header" style="color:blue">Hello</div>';
    const ctx = makeContextWithRules([
      { selector: '.header', declarations: { color: 'red', 'font-size': '14px' } },
    ]);
    const result = applyInlineStyleRules(html, ctx);
    // Existing color:blue should NOT be overwritten
    expect(result).toContain('color:blue');
    expect(result).not.toContain('color:red');
    // But font-size should be added
    expect(result).toContain('font-size:14px');
  });

  it('handles multiple classes matching different rules', () => {
    const html = '<div class="bold red-text">Hello</div>';
    const ctx = makeContextWithRules([
      { selector: '.bold', declarations: { 'font-weight': 'bold' } },
      { selector: '.red-text', declarations: { color: 'red' } },
    ]);
    const result = applyInlineStyleRules(html, ctx);
    expect(result).toContain('font-weight:bold');
    expect(result).toContain('color:red');
  });

  it('ignores non-class selectors', () => {
    const html = '<h1 class="title">Hello</h1>';
    const ctx = makeContextWithRules([
      { selector: 'h1', declarations: { color: 'red' } },
    ]);
    const result = applyInlineStyleRules(html, ctx);
    // Type selectors are not supported for inline injection
    expect(result).not.toContain('style=');
  });

  it('ignores compound selectors', () => {
    const html = '<div class="a b">Hello</div>';
    const ctx = makeContextWithRules([
      { selector: '.a .b', declarations: { color: 'red' } },
    ]);
    const result = applyInlineStyleRules(html, ctx);
    expect(result).not.toContain('style=');
  });

  it('applies to multiple elements with the same class', () => {
    const html = '<p class="highlight">A</p><p class="highlight">B</p>';
    const ctx = makeContextWithRules([
      { selector: '.highlight', declarations: { color: '#e85d3a' } },
    ]);
    const result = applyInlineStyleRules(html, ctx);
    // Both elements should get the style
    const matches = result.match(/style="color:#e85d3a"/g);
    expect(matches).toHaveLength(2);
  });

  it('does not affect elements without matching class', () => {
    const html = '<div class="other">Hello</div>';
    const ctx = makeContextWithRules([
      { selector: '.header', declarations: { color: 'red' } },
    ]);
    const result = applyInlineStyleRules(html, ctx);
    expect(result).not.toContain('style=');
    expect(result).toBe(html);
  });

  it('handles elements with no class attribute', () => {
    const html = '<div>Hello</div>';
    const ctx = makeContextWithRules([
      { selector: '.header', declarations: { color: 'red' } },
    ]);
    const result = applyInlineStyleRules(html, ctx);
    expect(result).toBe(html);
  });

  it('handles later rules overriding earlier ones for same class', () => {
    const html = '<div class="item">Hello</div>';
    const ctx = makeContextWithRules([
      { selector: '.item', declarations: { color: 'red' } },
      { selector: '.item', declarations: { color: 'blue', 'font-size': '14px' } },
    ]);
    const result = applyInlineStyleRules(html, ctx);
    // Later rule should override: color is blue
    expect(result).toContain('color:blue');
    expect(result).toContain('font-size:14px');
  });

  it('handles complex HTML with nested tags', () => {
    const html = '<table><tr><td class="cell" style="padding:10px"><p class="text">Hi</p></td></tr></table>';
    const ctx = makeContextWithRules([
      { selector: '.cell', declarations: { 'background-color': '#fff' } },
      { selector: '.text', declarations: { color: '#333' } },
    ]);
    const result = applyInlineStyleRules(html, ctx);
    expect(result).toContain('background-color:#fff');
    expect(result).toContain('padding:10px');
    expect(result).toContain('color:#333');
  });
});
