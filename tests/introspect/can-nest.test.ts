/**
 * Tests for `introspect.canNest(parentType, childType)`.
 *
 * Covers built-in nesting rules, plugin-registered components, unknown types,
 * and the documented logic-component fallthrough.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { introspect, defineComponent } from '../../src/index.js';
import { _resetRegistry } from '../../src/registry/component-registry.js';
import '../../src/registry/init.js';

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

  describe('plugin components', () => {
    afterEach(() => {
      _resetRegistry();
    });

    it('honors a plugin defined with parent: mc-column', () => {
      defineComponent({
        type: 'acme-card',
        metadata: {
          description: 'Test card',
          category: 'content',
          parent: 'mc-column',
          maxChildren: 0,
          allowsTextContent: false,
          compilerOutputElements: ['div'],
          compilerOutputReason: 'test',
          validClassCategories: [],
          commonMistakes: [],
          attributes: {},
        },
        compile: () => '<div>card</div>',
      });

      expect(introspect.canNest('mc-column', 'acme-card')).toBe(true);
      expect(introspect.canNest('mc-section', 'acme-card')).toBe(false);
    });

    it('honors alternateParents', () => {
      defineComponent({
        type: 'acme-banner',
        metadata: {
          description: 'Test banner',
          category: 'content',
          parent: 'mc-body',
          alternateParents: ['mc-column'],
          maxChildren: 0,
          allowsTextContent: false,
          compilerOutputElements: ['div'],
          compilerOutputReason: 'test',
          validClassCategories: [],
          commonMistakes: [],
          attributes: {},
        },
        compile: () => '<div>banner</div>',
      });

      expect(introspect.canNest('mc-body', 'acme-banner')).toBe(true);
      expect(introspect.canNest('mc-column', 'acme-banner')).toBe(true);
      expect(introspect.canNest('mc-section', 'acme-banner')).toBe(false);
    });
  });
});
