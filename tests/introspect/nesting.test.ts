import { describe, it, expect, beforeEach } from 'vitest';
import { getNestingMatrix, _resetNestingCache } from '../../src/introspect/nesting.js';

describe('getNestingMatrix()', () => {
  beforeEach(() => {
    _resetNestingCache();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Return shape
  // ────────────────────────────────────────────────────────────────────────

  describe('return shape', () => {
    it('returns an object with parentToChildren, childToParents, and requiredPaths', () => {
      const matrix = getNestingMatrix();
      expect(matrix).toHaveProperty('parentToChildren');
      expect(matrix).toHaveProperty('childToParents');
      expect(matrix).toHaveProperty('requiredPaths');
    });

    it('parentToChildren is a Record<string, string[]>', () => {
      const { parentToChildren } = getNestingMatrix();
      for (const [key, val] of Object.entries(parentToChildren)) {
        expect(typeof key).toBe('string');
        expect(Array.isArray(val)).toBe(true);
      }
    });

    it('childToParents is a Record<string, string[]>', () => {
      const { childToParents } = getNestingMatrix();
      for (const [key, val] of Object.entries(childToParents)) {
        expect(typeof key).toBe('string');
        expect(Array.isArray(val)).toBe(true);
      }
    });

    it('requiredPaths is an array of NestingPath objects', () => {
      const { requiredPaths } = getNestingMatrix();
      expect(Array.isArray(requiredPaths)).toBe(true);
      for (const p of requiredPaths) {
        expect(typeof p.target).toBe('string');
        expect(Array.isArray(p.path)).toBe(true);
        expect(typeof p.description).toBe('string');
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Cache identity
  // ────────────────────────────────────────────────────────────────────────

  describe('cache identity', () => {
    it('returns the same object reference on repeated calls', () => {
      const a = getNestingMatrix();
      const b = getNestingMatrix();
      expect(a).toBe(b);
    });

    it('returns a new object after _resetNestingCache()', () => {
      const a = getNestingMatrix();
      _resetNestingCache();
      const b = getNestingMatrix();
      expect(a).not.toBe(b);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // parentToChildren
  // ────────────────────────────────────────────────────────────────────────

  describe('parentToChildren', () => {
    it('mc-body and mc-head are top-level containers with no parent entry (mc root is internal)', () => {
      const { parentToChildren } = getNestingMatrix();
      // 'mc' is the internal document root — it is filtered from allowedParents
      // so parentToChildren['mc'] is either undefined or empty
      expect(parentToChildren['mc'] ?? []).toHaveLength(0);
    });

    it('mc-body has mc-section and mc-hero as children', () => {
      const { parentToChildren } = getNestingMatrix();
      expect(parentToChildren['mc-body']).toContain('mc-section');
      expect(parentToChildren['mc-body']).toContain('mc-hero');
    });

    it('mc-section has mc-column as a child', () => {
      const { parentToChildren } = getNestingMatrix();
      expect(parentToChildren['mc-section']).toContain('mc-column');
    });

    it('mc-column has mc-button, mc-text, mc-image, mc-divider, mc-spacer, mc-raw as children', () => {
      const { parentToChildren } = getNestingMatrix();
      const children = parentToChildren['mc-column']!;
      expect(children).toContain('mc-button');
      expect(children).toContain('mc-text');
      expect(children).toContain('mc-image');
      expect(children).toContain('mc-divider');
      expect(children).toContain('mc-spacer');
      expect(children).toContain('mc-raw');
    });

    it('mc-hero has mc-button, mc-text, mc-image, mc-divider, mc-spacer as children', () => {
      const { parentToChildren } = getNestingMatrix();
      const children = parentToChildren['mc-hero']!;
      expect(children).toContain('mc-button');
      expect(children).toContain('mc-text');
      expect(children).toContain('mc-image');
      expect(children).toContain('mc-divider');
      expect(children).toContain('mc-spacer');
    });

    it('mc-head has mc-preview, mc-attributes, mc-style, mc-title as children', () => {
      const { parentToChildren } = getNestingMatrix();
      const children = parentToChildren['mc-head']!;
      expect(children).toContain('mc-preview');
      expect(children).toContain('mc-attributes');
      expect(children).toContain('mc-style');
      expect(children).toContain('mc-title');
    });

    it('mc-attributes has mc-all as a child', () => {
      const { parentToChildren } = getNestingMatrix();
      expect(parentToChildren['mc-attributes']).toContain('mc-all');
    });

    it('mc-raw is NOT a child of mc-hero (mc-hero is not in mc-raw alternateParents)', () => {
      const { parentToChildren } = getNestingMatrix();
      const children = parentToChildren['mc-hero']!;
      expect(children).not.toContain('mc-raw');
    });

    it('children arrays are sorted alphabetically', () => {
      const { parentToChildren } = getNestingMatrix();
      for (const children of Object.values(parentToChildren)) {
        const sorted = [...children].sort();
        expect(children).toEqual(sorted);
      }
    });

    it('every structural component type has an entry', () => {
      const { parentToChildren } = getNestingMatrix();
      const structural = [
        'mc', 'mc-body', 'mc-head', 'mc-section', 'mc-hero', 'mc-column',
        'mc-button', 'mc-text', 'mc-image', 'mc-divider', 'mc-spacer', 'mc-raw',
      ];
      for (const type of structural) {
        expect(parentToChildren).toHaveProperty(type);
      }
    });

    it('leaf components have empty children arrays', () => {
      const { parentToChildren } = getNestingMatrix();
      // These are pure leaf components — they accept no children.
      const leaves = ['mc-button', 'mc-text', 'mc-image', 'mc-divider', 'mc-spacer'];
      for (const leaf of leaves) {
        expect(parentToChildren[leaf]).toEqual([]);
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // childToParents
  // ────────────────────────────────────────────────────────────────────────

  describe('childToParents', () => {
    it('mc has no allowed parents (it is the document root)', () => {
      const { childToParents } = getNestingMatrix();
      expect(childToParents['mc']).toEqual([]);
    });

    it('mc-body has no allowed parents (top-level container — mc root is internal)', () => {
      const { childToParents } = getNestingMatrix();
      expect(childToParents['mc-body']).toEqual([]);
    });

    it('mc-head has no allowed parents (top-level container — mc root is internal)', () => {
      const { childToParents } = getNestingMatrix();
      expect(childToParents['mc-head']).toEqual([]);
    });

    it('mc-section has mc-body as its only parent', () => {
      const { childToParents } = getNestingMatrix();
      expect(childToParents['mc-section']).toEqual(['mc-body']);
    });

    it('mc-column has mc-section and mc-group as parents', () => {
      const { childToParents } = getNestingMatrix();
      expect(childToParents['mc-column']).toContain('mc-section');
      expect(childToParents['mc-column']).toContain('mc-group');
    });

    it('mc-button has mc-column and mc-hero as parents', () => {
      const { childToParents } = getNestingMatrix();
      expect(childToParents['mc-button']).toContain('mc-column');
      expect(childToParents['mc-button']).toContain('mc-hero');
    });

    it('mc-text has mc-column and mc-hero as parents', () => {
      const { childToParents } = getNestingMatrix();
      expect(childToParents['mc-text']).toContain('mc-column');
      expect(childToParents['mc-text']).toContain('mc-hero');
    });

    it('mc-image has mc-column and mc-hero as parents', () => {
      const { childToParents } = getNestingMatrix();
      expect(childToParents['mc-image']).toContain('mc-column');
      expect(childToParents['mc-image']).toContain('mc-hero');
    });

    it('mc-divider has mc-column and mc-hero as parents', () => {
      const { childToParents } = getNestingMatrix();
      expect(childToParents['mc-divider']).toContain('mc-column');
      expect(childToParents['mc-divider']).toContain('mc-hero');
    });

    it('mc-spacer has mc-column and mc-hero as parents', () => {
      const { childToParents } = getNestingMatrix();
      expect(childToParents['mc-spacer']).toContain('mc-column');
      expect(childToParents['mc-spacer']).toContain('mc-hero');
    });

    it('mc-raw includes mc-column, mc-body, and mc-section as parents', () => {
      const { childToParents } = getNestingMatrix();
      expect(childToParents['mc-raw']).toContain('mc-column');
      expect(childToParents['mc-raw']).toContain('mc-body');
      expect(childToParents['mc-raw']).toContain('mc-section');
    });

    it('mc-preview has mc-head as its only parent', () => {
      const { childToParents } = getNestingMatrix();
      expect(childToParents['mc-preview']).toEqual(['mc-head']);
    });

    it('mc-attributes has mc-head as its only parent', () => {
      const { childToParents } = getNestingMatrix();
      expect(childToParents['mc-attributes']).toEqual(['mc-head']);
    });

    it('mc-all has mc-attributes as its only parent', () => {
      const { childToParents } = getNestingMatrix();
      expect(childToParents['mc-all']).toEqual(['mc-attributes']);
    });

    it('logic components have empty childToParents arrays', () => {
      const { childToParents } = getNestingMatrix();
      const logic = ['mc-if', 'mc-else-if', 'mc-else', 'mc-each'];
      for (const type of logic) {
        if (type in childToParents) {
          expect(childToParents[type]).toEqual([]);
        }
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // requiredPaths
  // ────────────────────────────────────────────────────────────────────────

  describe('requiredPaths', () => {
    it('includes a path for mc-button', () => {
      const { requiredPaths } = getNestingMatrix();
      const path = requiredPaths.find(p => p.target === 'mc-button');
      expect(path).toBeDefined();
    });

    it('mc-button canonical path is mc-body → mc-section → mc-column → mc-button', () => {
      const { requiredPaths } = getNestingMatrix();
      const path = requiredPaths.find(p => p.target === 'mc-button');
      expect(path!.path).toEqual(['mc-body', 'mc-section', 'mc-column', 'mc-button']);
    });

    it('mc-column canonical path is mc-body → mc-section → mc-column', () => {
      const { requiredPaths } = getNestingMatrix();
      const path = requiredPaths.find(p => p.target === 'mc-column');
      expect(path!.path).toEqual(['mc-body', 'mc-section', 'mc-column']);
    });

    it('mc-section canonical path is mc-body → mc-section', () => {
      const { requiredPaths } = getNestingMatrix();
      const path = requiredPaths.find(p => p.target === 'mc-section');
      expect(path!.path).toEqual(['mc-body', 'mc-section']);
    });

    it('mc-body has no required path (it is a document root container)', () => {
      const { requiredPaths } = getNestingMatrix();
      const path = requiredPaths.find(p => p.target === 'mc-body');
      // mc-body has no allowedParents (mc root is internal) → no required path
      expect(path).toBeUndefined();
    });

    it('mc-head has no required path (it is a document root container)', () => {
      const { requiredPaths } = getNestingMatrix();
      const path = requiredPaths.find(p => p.target === 'mc-head');
      // mc-head has no allowedParents (mc root is internal) → no required path
      expect(path).toBeUndefined();
    });

    it('path always ends with the target type', () => {
      const { requiredPaths } = getNestingMatrix();
      for (const p of requiredPaths) {
        expect(p.path[p.path.length - 1]).toBe(p.target);
      }
    });

    it('path has at least 2 elements', () => {
      const { requiredPaths } = getNestingMatrix();
      for (const p of requiredPaths) {
        expect(p.path.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('does NOT include a path for mc (the root has no required path)', () => {
      const { requiredPaths } = getNestingMatrix();
      const path = requiredPaths.find(p => p.target === 'mc');
      expect(path).toBeUndefined();
    });

    it('does NOT include paths for logic components (mc-if, mc-each, etc.)', () => {
      const { requiredPaths } = getNestingMatrix();
      const logic = ['mc-if', 'mc-else-if', 'mc-else', 'mc-each'];
      for (const type of logic) {
        const path = requiredPaths.find(p => p.target === type);
        expect(path).toBeUndefined();
      }
    });

    it('includes paths for all content components', () => {
      const { requiredPaths } = getNestingMatrix();
      const targets = requiredPaths.map(p => p.target);
      const content = ['mc-button', 'mc-text', 'mc-image', 'mc-divider', 'mc-spacer'];
      for (const type of content) {
        expect(targets).toContain(type);
      }
    });

    it('description includes the target component name', () => {
      const { requiredPaths } = getNestingMatrix();
      for (const p of requiredPaths) {
        expect(p.description).toContain(p.target);
      }
    });

    it('description is a non-empty string ending with a period', () => {
      const { requiredPaths } = getNestingMatrix();
      for (const p of requiredPaths) {
        expect(p.description.length).toBeGreaterThan(0);
        expect(p.description.endsWith('.')).toBe(true);
      }
    });

    it('paths are sorted by length (shallowest first)', () => {
      const { requiredPaths } = getNestingMatrix();
      for (let i = 1; i < requiredPaths.length; i++) {
        expect(requiredPaths[i]!.path.length).toBeGreaterThanOrEqual(
          requiredPaths[i - 1]!.path.length,
        );
      }
    });

    it('mc-raw canonical path uses mc-column as the canonical parent', () => {
      const { requiredPaths } = getNestingMatrix();
      const path = requiredPaths.find(p => p.target === 'mc-raw');
      expect(path).toBeDefined();
      // mc-raw's first allowedParent is mc-column (canonical)
      expect(path!.path[path!.path.length - 2]).toBe('mc-column');
    });
  });
});
