import { describe, it, expect } from 'vitest';
import { inlineCSS } from '../../src/css/inliner.js';
import { resolveTheme } from '../../src/css/theme-resolver.js';

const theme = resolveTheme();

describe('order sensitivity audit', () => {
  it('mt-6 m-3 — specific then broad', () => {
    const r = inlineCSS('mt-6 m-3', theme);
    // mt-6 is more specific — it should win for margin-top
    expect(r.inlineStyle).toContain('margin-top:24px');
  });

  it('m-3 mt-6 — broad then specific', () => {
    const r = inlineCSS('m-3 mt-6', theme);
    // mt-6 is more specific — it should win for margin-top
    expect(r.inlineStyle).toContain('margin-top:24px');
  });

  it('p-4 pt-8 — broad then specific', () => {
    const r = inlineCSS('p-4 pt-8', theme);
    expect(r.inlineStyle).toContain('padding-top:32px');
  });

  it('pt-8 p-4 — specific then broad', () => {
    const r = inlineCSS('pt-8 p-4', theme);
    // pt-8 should win for padding-top
    expect(r.inlineStyle).toContain('padding-top:32px');
  });
});
