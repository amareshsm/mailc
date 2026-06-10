/**
 * Tests for `introspect.canNest(parentType, childType)`.
 *
 * Covers built-in nesting rules, unknown types, and the documented
 * logic-component fallthrough. After the plugin-as-values migration,
 * `canNest` operates over built-ins only — plugins are per-call values
 * with no global identity, so structural questions about plugin nesting
 * are answered against `plugin.metadata` directly (or by passing the
 * plugin through `compile(src, { plugins })` and reading the validator
 * output).
 */

import { describe, expect, it } from 'vitest';
import { introspect } from '../../src/index.js';

describe('introspect.canNest', () => {
  describe('built-in components', () => {
    it('allows mc-button inside mc-column', () => {
      expect(introspect.canNest('mc-column', 'mc-button')).toBe(true);
    });

    it('allows mc-text inside mc-column', () => {
      expect(introspect.canNest('mc-column', 'mc-text')).toBe(true);
    });

    it('allows mc-column inside mc-section', () => {
      expect(introspect.canNest('mc-section', 'mc-column')).toBe(true);
    });

    it('rejects mc-button directly inside mc-section (must go through mc-column)', () => {
      expect(introspect.canNest('mc-section', 'mc-button')).toBe(false);
    });

    it('rejects mc-section inside mc-column (wrong direction)', () => {
      expect(introspect.canNest('mc-column', 'mc-section')).toBe(false);
    });

    it('rejects mc-body inside mc-section', () => {
      expect(introspect.canNest('mc-section', 'mc-body')).toBe(false);
    });

    it('allows mc-list inside mc-column and mc-hero', () => {
      expect(introspect.canNest('mc-column', 'mc-list')).toBe(true);
      expect(introspect.canNest('mc-hero', 'mc-list')).toBe(true);
    });

    it('allows mc-list-item only inside mc-list', () => {
      expect(introspect.canNest('mc-list', 'mc-list-item')).toBe(true);
      expect(introspect.canNest('mc-column', 'mc-list-item')).toBe(false);
      expect(introspect.canNest('mc-section', 'mc-list-item')).toBe(false);
    });
  });

  describe('unknown types', () => {
    it('returns false when child is unknown', () => {
      expect(introspect.canNest('mc-column', 'mc-not-a-thing')).toBe(false);
    });

    it('returns false when parent is unknown', () => {
      expect(introspect.canNest('mc-not-a-thing', 'mc-button')).toBe(false);
    });

    it('returns false when both are unknown', () => {
      expect(introspect.canNest('foo', 'bar')).toBe(false);
    });

    it('returns false for empty string inputs', () => {
      expect(introspect.canNest('', 'mc-button')).toBe(false);
      expect(introspect.canNest('mc-column', '')).toBe(false);
    });
  });

  describe('logic components', () => {
    it('returns false for mc-if (logic — use introspect.validate instead)', () => {
      expect(introspect.canNest('mc-column', 'mc-if')).toBe(false);
    });

    it('returns false for mc-each', () => {
      expect(introspect.canNest('mc-column', 'mc-each')).toBe(false);
    });
  });

  // Plugin nesting: `introspect.canNest` is built-in-only after the
  // plugin-as-values migration. Plugin nesting is determined by the
  // plugin's own metadata (`plugin.metadata.parent` /
  // `plugin.metadata.alternateParents`), accessed directly on the
  // returned Plugin value rather than via global introspection.
});
