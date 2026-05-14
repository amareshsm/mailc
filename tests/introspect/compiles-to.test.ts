/**
 * @file tests/introspect/compiles-to.test.ts
 *
 * Tests for `getCompilesToSpec()` — Phase 6 of the Introspection API.
 */

import { describe, it, expect } from 'vitest';
import { getCompilesToSpec } from '../../src/introspect/compiles-to.js';
import { COMPONENT_RULES } from '../../src/validator/rules.js';

describe('getCompilesToSpec', () => {
  it('returns undefined for unknown component', () => {
    expect(getCompilesToSpec('mc-unknown')).toBeUndefined();
  });

  it('mc-button includes v:roundrect for Outlook VML', () => {
    const spec = getCompilesToSpec('mc-button');
    expect(spec?.outputElements).toContain('v:roundrect');
    expect(spec?.outputElements).toContain('a');
    expect(spec?.outputElements).toContain('table');
  });

  it('mc-raw outputs nothing (passthrough)', () => {
    const spec = getCompilesToSpec('mc-raw');
    expect(spec?.outputElements).toEqual([]);
  });

  it('mc-section outputs a table structure', () => {
    const spec = getCompilesToSpec('mc-section');
    expect(spec?.outputElements).toContain('table');
    expect(spec?.outputElements).toContain('td');
  });

  it('mc-image outputs table + img', () => {
    const spec = getCompilesToSpec('mc-image');
    expect(spec?.outputElements).toContain('table');
    expect(spec?.outputElements).toContain('img');
  });

  it('mc-preview outputs a div', () => {
    const spec = getCompilesToSpec('mc-preview');
    expect(spec?.outputElements).toContain('div');
  });

  it('every known component has a non-empty reason', () => {
    for (const type of Object.keys(COMPONENT_RULES)) {
      const spec = getCompilesToSpec(type);
      expect(spec, `${type} should have a spec`).toBeDefined();
      expect(spec!.reason.length, `${type} reason should be non-empty`).toBeGreaterThan(10);
    }
  });

  it('annotatedExample has input and output strings', () => {
    const spec = getCompilesToSpec('mc-button');
    expect(typeof spec?.annotatedExample.input).toBe('string');
    expect(typeof spec?.annotatedExample.output).toBe('string');
  });
});
