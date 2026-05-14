/**
 * Tests for src/post-processor/contrast-checker.ts
 *
 * Two-tier severity model:
 *   warning — ratio < 3:1   (fails WCAG AA even for large text)
 *   info    — ratio 3–4.5:1 (fails AA for normal text; ok for large/bold)
 *
 * Reference ratios used in these tests:
 *   #cccccc on #ffffff ≈ 1.61:1  → warning
 *   #888888 on #ffffff ≈ 3.54:1  → info
 *   #000000 on #ffffff  = 21:1   → pass (no issue)
 */

import { describe, it, expect } from 'vitest';
import { checkColorContrast } from '../../src/post-processor/contrast-checker.js';

// ---------------------------------------------------------------------------
// No-issue cases
// ---------------------------------------------------------------------------

describe('no issues', () => {
  it('returns empty array for HTML without explicit colors', () => {
    expect(checkColorContrast('<div><p>Hello world</p></div>')).toEqual([]);
  });

  it('returns empty array when only foreground color is set (no background)', () => {
    // No explicit background — bail (zero false positives)
    expect(checkColorContrast('<div><p style="color:#333333;">Text</p></div>')).toEqual([]);
  });

  it('passes for high contrast: black on white (21:1)', () => {
    const html = '<div style="background-color:#ffffff;"><p style="color:#000000;">Good</p></div>';
    expect(checkColorContrast(html)).toEqual([]);
  });

  it('passes for named color pair with high contrast', () => {
    const html = '<div style="background-color:white;"><p style="color:black;">Text</p></div>';
    expect(checkColorContrast(html)).toEqual([]);
  });

  it('uses nearest ancestor background — dark bg makes light text pass', () => {
    const html =
      '<div style="background-color:#ffffff;">' +
      '<div style="background-color:#000000;">' +
      '<p style="color:#ffffff;">White on black</p>' +
      '</div></div>';
    expect(checkColorContrast(html)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Warning tier: ratio < 3:1 (fails WCAG AA Large)
// ---------------------------------------------------------------------------

describe('warning tier (ratio < 3:1)', () => {
  it('emits warning for very low contrast: #cccccc on #ffffff (~1.61:1)', () => {
    const html = '<div style="background-color:#ffffff;"><p style="color:#cccccc;">Low contrast</p></div>';
    const issues = checkColorContrast(html);
    expect(issues.length).toBe(1);
    expect(issues[0]!.code).toBe('LOW_CONTRAST');
    expect(issues[0]!.severity).toBe('warning');
    expect(issues[0]!.message).toContain('#cccccc');
    expect(issues[0]!.message).toContain('#ffffff');
  });

  it('walks ancestor chain and still emits warning', () => {
    const html = '<table style="background-color:#ffffff;"><tr><td><p style="color:#cccccc;">Text</p></td></tr></table>';
    const issues = checkColorContrast(html);
    expect(issues.length).toBe(1);
    expect(issues[0]!.severity).toBe('warning');
  });

  it('emits warning for element with both color and background-color below 3:1', () => {
    const html = '<p style="color:#cccccc;background-color:#ffffff;">Text</p>';
    const issues = checkColorContrast(html);
    expect(issues.length).toBe(1);
    expect(issues[0]!.severity).toBe('warning');
  });

  it('warning message mentions large-text threshold', () => {
    const html = '<div style="background-color:#ffffff;"><p style="color:#cccccc;">Text</p></div>';
    const issues = checkColorContrast(html);
    expect(issues[0]!.message).toContain('3');
  });
});

// ---------------------------------------------------------------------------
// Info tier: ratio 3:1–4.5:1 (fails AA for normal text)
// ---------------------------------------------------------------------------

describe('info tier (ratio 3:1–4.5:1)', () => {
  it('emits info for borderline contrast: #888888 on #ffffff (~3.54:1)', () => {
    const html = '<div style="background-color:#ffffff;"><p style="color:#888888;">Borderline</p></div>';
    const issues = checkColorContrast(html);
    expect(issues.length).toBe(1);
    expect(issues[0]!.code).toBe('LOW_CONTRAST');
    expect(issues[0]!.severity).toBe('info');
    expect(issues[0]!.message).toContain('#888888');
  });

  it('info message mentions WCAG AA normal-text threshold', () => {
    const html = '<div style="background-color:#ffffff;"><p style="color:#888888;">Text</p></div>';
    const issues = checkColorContrast(html);
    expect(issues[0]!.message).toContain('4.5');
  });
});

// ---------------------------------------------------------------------------
// Bail-out / skip cases (zero false positives)
// ---------------------------------------------------------------------------

describe('bail-out cases', () => {
  it('skips elements with transparent background in ancestor chain', () => {
    const html = '<div style="background-color:#ffffff;"><div style="background-color:transparent;"><p style="color:#cccccc;">Text</p></div></div>';
    expect(checkColorContrast(html)).toEqual([]);
  });

  it('skips elements with background-image', () => {
    const html = '<div style="background-color:#ffffff;background-image:url(bg.jpg);"><p style="color:#cccccc;">Text</p></div>';
    expect(checkColorContrast(html)).toEqual([]);
  });

  it('skips elements with gradient background', () => {
    const html = '<div style="background:linear-gradient(to right, red, blue);"><p style="color:#ffffff;">Text</p></div>';
    expect(checkColorContrast(html)).toEqual([]);
  });

  it('skips non-opaque foreground colors', () => {
    const html = '<div style="background-color:#ffffff;"><p style="color:rgba(0,0,0,0.5);">Text</p></div>';
    expect(checkColorContrast(html)).toEqual([]);
  });

  it('skips CSS variable foreground', () => {
    const html = '<div style="background-color:#ffffff;"><p style="color:var(--text);">Text</p></div>';
    expect(checkColorContrast(html)).toEqual([]);
  });

  it('skips inherit foreground', () => {
    const html = '<div style="background-color:#ffffff;"><p style="color:inherit;">Text</p></div>';
    expect(checkColorContrast(html)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Multiple elements / mixed tiers
// ---------------------------------------------------------------------------

describe('multiple elements', () => {
  it('emits one issue per failing element', () => {
    const html =
      '<div style="background-color:#ffffff;">' +
      '<p style="color:#000000;">Good</p>' +
      '<p style="color:#cccccc;">Bad</p>' +
      '</div>';
    const issues = checkColorContrast(html);
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain('#cccccc');
  });

  it('emits both warning and info when two elements fall in different tiers', () => {
    const html =
      '<div style="background-color:#ffffff;">' +
      '<p style="color:#cccccc;">Very low (~1.61:1)</p>' +
      '<p style="color:#888888;">Borderline (~3.54:1)</p>' +
      '</div>';
    const issues = checkColorContrast(html);
    expect(issues.length).toBe(2);
    const severities = issues.map((i) => i.severity).sort();
    expect(severities).toEqual(['info', 'warning']);
  });
});

// ---------------------------------------------------------------------------
// Structural / edge cases
// ---------------------------------------------------------------------------

describe('structural edge cases', () => {
  it('handles self-closing void elements correctly', () => {
    const html = '<div style="background-color:#ffffff;"><img src="x" /><p style="color:#cccccc;">Text</p></div>';
    expect(checkColorContrast(html).length).toBe(1);
  });

  it('reports approximate line numbers', () => {
    const html = '<div style="background-color:#ffffff;">\n<p style="color:#cccccc;">Low contrast</p>\n</div>';
    const issues = checkColorContrast(html);
    expect(issues.length).toBe(1);
    expect(issues[0]!.loc).toBeDefined();
    expect(issues[0]!.loc!.line).toBeGreaterThanOrEqual(1);
  });
});
