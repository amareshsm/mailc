/**
 * Unit tests for hero lint rules.
 *
 * Tests `heroHasFallbackColor` and `heroImageIsHttps` individually
 * with passing and failing HTML snippets.
 */

import { describe, it, expect } from 'vitest';
import { heroHasFallbackColor, heroImageIsHttps } from '../../src/lint/rules/hero.js';

// ===========================================================================
// heroHasFallbackColor
// ===========================================================================

describe('hero-has-fallback-color', () => {
  it('passes when no v:rect present (no VML hero)', () => {
    const html = '<table><tr><td style="background-color:#333"></td></tr></table>';
    expect(heroHasFallbackColor.check(html)).toEqual([]);
  });

  it('passes when v:rect has fillcolor attribute', () => {
    const html = '<v:rect xmlns:v="urn:schemas-microsoft-com:vml" fillcolor="#1a1a2e" style="width:600px;height:400px;"></v:rect>';
    expect(heroHasFallbackColor.check(html)).toEqual([]);
  });

  it('fails when v:rect is missing fillcolor', () => {
    const html = '<v:rect xmlns:v="urn:schemas-microsoft-com:vml" style="width:600px;height:400px;"></v:rect>';
    const issues = heroHasFallbackColor.check(html);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('hero-has-fallback-color');
    expect(issues[0]!.severity).toBe('warning');
  });

  it('passes when v:rect has fillcolor with extra whitespace', () => {
    const html = '<v:rect fillcolor = "#ff0000" style="width:600px;"></v:rect>';
    expect(heroHasFallbackColor.check(html)).toEqual([]);
  });

  it('has correct metadata', () => {
    expect(heroHasFallbackColor.id).toBe('hero-has-fallback-color');
    expect(heroHasFallbackColor.severity).toBe('warning');
    expect(heroHasFallbackColor.category).toBe('outlook');
  });
});

// ===========================================================================
// heroImageIsHttps
// ===========================================================================

describe('hero-image-is-https', () => {
  it('passes when no background-image present', () => {
    const html = '<div style="background-color:#333;padding:40px"></div>';
    expect(heroImageIsHttps.check(html)).toEqual([]);
  });

  it('passes when background-image uses https://', () => {
    const html = '<div style="background-image:url(https://cdn.example.com/hero.jpg)"></div>';
    expect(heroImageIsHttps.check(html)).toEqual([]);
  });

  it('fails when background-image uses http://', () => {
    const html = '<div style="background-image:url(http://cdn.example.com/hero.jpg)"></div>';
    const issues = heroImageIsHttps.check(html);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('hero-image-is-https');
    expect(issues[0]!.severity).toBe('warning');
    expect(issues[0]!.message).toContain('http://cdn.example.com/hero.jpg');
  });

  it('reports each HTTP background-image separately', () => {
    const html = [
      '<div style="background-image:url(http://example.com/a.jpg)"></div>',
      '<div style="background-image:url(http://example.com/b.jpg)"></div>',
    ].join('\n');
    const issues = heroImageIsHttps.check(html);
    expect(issues).toHaveLength(2);
  });

  it('passes for relative URLs', () => {
    const html = '<div style="background-image:url(/images/hero.jpg)"></div>';
    expect(heroImageIsHttps.check(html)).toEqual([]);
  });

  it('passes for quoted URL values', () => {
    const html = `<div style="background-image:url('https://example.com/hero.jpg')"></div>`;
    expect(heroImageIsHttps.check(html)).toEqual([]);
  });

  it('has correct metadata', () => {
    expect(heroImageIsHttps.id).toBe('hero-image-is-https');
    expect(heroImageIsHttps.severity).toBe('warning');
    expect(heroImageIsHttps.category).toBe('images');
  });
});
