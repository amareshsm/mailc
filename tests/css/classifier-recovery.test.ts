/**
 * Tests for `buildClassificationMap`'s recovery path when caniemail's bulk
 * probe call throws for at least one (property × client) pair.
 *
 * The bug being guarded against: when ANY one probe-property is missing in
 * ANY one target-client's dataset, caniemail-sdk throws — and the old
 * `try { ... } catch { /* silent SAFE fallback *\/ }` block discarded the
 * other ~70 properties' results too. The result: broad client lists
 * (`['*']`, `['thunderbird.*']`, or any combination including thunderbird)
 * silently bypassed all classification, with ZERO ENHANCE properties even
 * though many should have been flagged.
 *
 * The fix: when the bulk call throws, retry per-property. Only the truly
 * broken (property × client) pairs fall back to SAFE; everything else gets
 * classified correctly.
 *
 * @see src/css/classifier.ts — see "Per-property retry" path
 */
import { describe, it, expect } from 'vitest';
import { buildClassificationMap } from '../../src/css/classifier.js';

// ---------------------------------------------------------------------------
// Known-bad client set (forces the catch path)
// ---------------------------------------------------------------------------

/**
 * Including `thunderbird.*` triggers caniemail's
 *   `Feature "table-layout" not found on "thunderbird.macos"`
 * Verified empirically against caniemail-sdk 1.x. If caniemail later adds
 * `table-layout` data for thunderbird.macos, this test's bulk-throw
 * assumption no longer holds — pick a different known-missing pair.
 */
const BAD_CLIENTS = ['thunderbird.*'];

const BAD_CLIENTS_MIXED = [
  'gmail.*',
  'outlook.*',
  'thunderbird.*',
];

describe('classifier — recovery when caniemail bulk probe throws', () => {
  it('thunderbird-only correctly classifies modern props as SAFE (no all-SAFE collapse needed — they ARE safe)', () => {
    // Thunderbird is Gecko-based and supports border-radius, box-shadow,
    // opacity, etc. The bulk probe throws because `table-layout` is missing
    // from thunderbird.macos's dataset, but the per-property recovery
    // confirms the other properties ARE safe for this client set.
    const map = buildClassificationMap(BAD_CLIENTS);
    expect(map.get('border-radius')).toBe('SAFE');
    expect(map.get('box-shadow')).toBe('SAFE');
    expect(map.get('opacity')).toBe('SAFE');
  });

  it('still applies hardcoded ALWAYS_BREAKING overrides when bulk probe throws', () => {
    const map = buildClassificationMap(BAD_CLIENTS);
    expect(map.get('flex')).toBe('BREAKING');
    expect(map.get('grid-template-columns')).toBe('BREAKING');
    expect(map.get('top')).toBe('BREAKING');
    expect(map.get('float')).toBe('BREAKING');
  });

  it('still applies hardcoded ALWAYS_NO_EFFECT overrides when bulk probe throws', () => {
    const map = buildClassificationMap(BAD_CLIENTS);
    expect(map.get('transition')).toBe('NO_EFFECT');
    expect(map.get('animation')).toBe('NO_EFFECT');
    expect(map.get('transform')).toBe('NO_EFFECT');
    expect(map.get('cursor')).toBe('NO_EFFECT');
  });

  it('still classifies common SAFE properties as SAFE under the recovery path', () => {
    const map = buildClassificationMap(BAD_CLIENTS);
    expect(map.get('color')).toBe('SAFE');
    expect(map.get('background-color')).toBe('SAFE');
    expect(map.get('padding-top')).toBe('SAFE');
    expect(map.get('margin-top')).toBe('SAFE');
    expect(map.get('width')).toBe('SAFE');
  });

  it('mixed client list (gmail + outlook + thunderbird) still classifies ENHANCE properties', () => {
    // Pre-fix: this map collapsed to all-SAFE because thunderbird's missing
    // table-layout entry killed the bulk probe. Post-fix: gmail/outlook
    // results survive the recovery, so border-radius STAYS classified as
    // ENHANCE (Outlook 2007/2010/2013 don't support it).
    const map = buildClassificationMap(BAD_CLIENTS_MIXED);
    expect(map.get('border-radius')).toBe('ENHANCE');
    expect(map.get('box-shadow')).toBe('ENHANCE');
  });

  it('table-layout (the property that broke caniemail) is gracefully classified', () => {
    // table-layout isn't in ENHANCE_PROPERTIES, so the safe default of SAFE
    // is the correct outcome. The important invariant: no exception thrown,
    // no all-SAFE collapse for the rest of the map.
    const map = buildClassificationMap(BAD_CLIENTS);
    expect(map.get('table-layout')).toBeDefined();
    expect(['SAFE', 'ENHANCE', 'BREAKING', 'NO_EFFECT']).toContain(
      map.get('table-layout'),
    );
  });

  it("wildcard target ['*'] does not collapse to all-SAFE", () => {
    // Pre-fix regression: `['*']` matched thunderbird.macos which threw on
    // table-layout, which caused EVERY property to silently fall back to
    // SAFE. With recovery, Outlook variants in the wildcard set correctly
    // surface ENHANCE classifications for visual props.
    const map = buildClassificationMap(['*']);
    expect(map.get('border-radius')).toBe('ENHANCE');
    expect(map.get('box-shadow')).toBe('ENHANCE');
    expect(map.get('opacity')).toBe('ENHANCE');
    // Structural hardcoded overrides still hold under wildcard targeting.
    expect(map.get('flex')).toBe('BREAKING');
    expect(map.get('transition')).toBe('NO_EFFECT');
  });

  it('caching still works after recovery (no repeated per-property retry)', () => {
    const map1 = buildClassificationMap(BAD_CLIENTS);
    const map2 = buildClassificationMap(BAD_CLIENTS);
    // Module-level cache returns the same Map instance for identical client sets.
    expect(map1).toBe(map2);
  });
});
