/**
 * Tests for `buildPassthroughMap()` and the `instanceof PassthroughMap`
 * branch in `classifyProperty()`.
 *
 * The passthrough map disables the caniemail-driven classification step.
 * It does NOT disable mailc's hardcoded universal safety rules:
 *   - ALWAYS_BREAKING properties (display:flex, position:absolute, float, …)
 *     would visibly corrupt Outlook's table-based layout if inlined.
 *   - ALWAYS_NO_EFFECT properties (transition, animation, cursor, …) are
 *     dead bytes in every email client.
 * Neither rule is client-dependent; both must hold even when the user has
 * opted out of caniemail checking.
 *
 * ENHANCE properties (box-shadow, opacity, border-radius, …) become SAFE
 * under passthrough — the user explicitly said "don't gate me on client
 * support" so these go inline directly rather than being routed to a
 * `<style>` block for progressive enhancement.
 */
import { describe, it, expect } from 'vitest';
import {
  buildPassthroughMap,
  buildClassificationMap,
  classifyProperty,
} from '../../src/css/classifier.js';

describe('buildPassthroughMap() — safety rules still apply', () => {
  it('returns SAFE for an arbitrary unknown property', () => {
    const map = buildPassthroughMap();
    expect(map.get('totally-made-up-prop')).toBe('SAFE');
  });

  it('has() returns true for any key', () => {
    const map = buildPassthroughMap();
    expect(map.has('does-not-exist')).toBe(true);
    expect(map.has('color')).toBe(true);
  });

  it('STILL strips display:flex (ALWAYS_BREAKING — would corrupt Outlook)', () => {
    const map = buildPassthroughMap();
    expect(classifyProperty({ property: 'display', value: 'flex' }, map)).toBe('BREAKING');
  });

  it('STILL strips position:absolute (ALWAYS_BREAKING — would corrupt Outlook)', () => {
    const map = buildPassthroughMap();
    expect(classifyProperty({ property: 'position', value: 'absolute' }, map)).toBe('BREAKING');
  });

  it('STILL strips float (ALWAYS_BREAKING)', () => {
    const map = buildPassthroughMap();
    expect(classifyProperty({ property: 'float', value: 'left' }, map)).toBe('BREAKING');
  });

  it('STILL strips transition (ALWAYS_NO_EFFECT — dead bytes in every client)', () => {
    const map = buildPassthroughMap();
    expect(classifyProperty({ property: 'transition', value: 'all 200ms ease' }, map)).toBe('NO_EFFECT');
  });

  it('STILL strips cursor (ALWAYS_NO_EFFECT)', () => {
    const map = buildPassthroughMap();
    expect(classifyProperty({ property: 'cursor', value: 'pointer' }, map)).toBe('NO_EFFECT');
  });

  it('returns SAFE for ENHANCE property (box-shadow) — opted out of client gating', () => {
    const map = buildPassthroughMap();
    expect(classifyProperty({ property: 'box-shadow', value: '0 4px 8px #000' }, map)).toBe('SAFE');
  });

  it('returns SAFE for ENHANCE property (opacity) — opted out of client gating', () => {
    const map = buildPassthroughMap();
    expect(classifyProperty({ property: 'opacity', value: '0.8' }, map)).toBe('SAFE');
  });

  it('returns SAFE for ENHANCE property (border-radius) — opted out of client gating', () => {
    const map = buildPassthroughMap();
    expect(classifyProperty({ property: 'border-radius', value: '8px' }, map)).toBe('SAFE');
  });

  it('position:static stays SAFE under passthrough (only non-static values break)', () => {
    const map = buildPassthroughMap();
    expect(classifyProperty({ property: 'position', value: 'static' }, map)).toBe('SAFE');
  });

  it('display:block stays SAFE under passthrough', () => {
    const map = buildPassthroughMap();
    expect(classifyProperty({ property: 'display', value: 'block' }, map)).toBe('SAFE');
  });
});

describe('classification baseline (sanity check — default-map verdicts must differ from passthrough)', () => {
  // These baselines lock the dynamic-classification behavior so the
  // passthrough tests above remain meaningful (they only matter if the
  // default classifier really produces a non-SAFE verdict for some of
  // these properties).

  const defaultMap = buildClassificationMap([
    'gmail.*', 'apple-mail.*', 'outlook.*', 'yahoo.*',
  ]);

  it('default map: display:flex is BREAKING', () => {
    expect(classifyProperty({ property: 'display', value: 'flex' }, defaultMap)).toBe('BREAKING');
  });

  it('default map: position:absolute is BREAKING', () => {
    expect(classifyProperty({ property: 'position', value: 'absolute' }, defaultMap)).toBe('BREAKING');
  });

  it('default map: transition is NO_EFFECT', () => {
    expect(classifyProperty({ property: 'transition', value: 'all 200ms ease' }, defaultMap)).toBe('NO_EFFECT');
  });

  it('default map: box-shadow is ENHANCE for default targets', () => {
    expect(classifyProperty({ property: 'box-shadow', value: '0 4px 8px #000' }, defaultMap)).toBe('ENHANCE');
  });
});
