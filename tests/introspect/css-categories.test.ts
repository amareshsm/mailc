import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPropertiesForCategory,
  getCategoryForProperty,
  getAllCategories,
  _resetCssCategoriesCache,
  NO_EFFECT_PROPERTIES,
} from '../../src/introspect/css-categories.js';
import {
  ALWAYS_BREAKING,
  ALWAYS_NO_EFFECT,
  ENHANCE_PROPERTIES,
} from '../../src/css/classifier.js';

describe('getPropertiesForCategory()', () => {
  beforeEach(() => {
    _resetCssCategoriesCache();
  });

  // ── typography ────────────────────────────────────────────────────────

  describe('typography', () => {
    it('includes font-size', () => {
      expect(getPropertiesForCategory('typography')).toContain('font-size');
    });

    it('includes color', () => {
      expect(getPropertiesForCategory('typography')).toContain('color');
    });

    it('includes font-family', () => {
      expect(getPropertiesForCategory('typography')).toContain('font-family');
    });

    it('includes text-align', () => {
      expect(getPropertiesForCategory('typography')).toContain('text-align');
    });

    it('includes line-height', () => {
      expect(getPropertiesForCategory('typography')).toContain('line-height');
    });

    it('includes letter-spacing', () => {
      expect(getPropertiesForCategory('typography')).toContain('letter-spacing');
    });

    it('includes text-decoration', () => {
      expect(getPropertiesForCategory('typography')).toContain('text-decoration');
    });

    it('returns a non-empty array', () => {
      expect(getPropertiesForCategory('typography').length).toBeGreaterThan(0);
    });
  });

  // ── background ───────────────────────────────────────────────────────

  describe('background', () => {
    it('includes background-color', () => {
      expect(getPropertiesForCategory('background')).toContain('background-color');
    });

    it('includes background', () => {
      expect(getPropertiesForCategory('background')).toContain('background');
    });
  });

  // ── border ───────────────────────────────────────────────────────────

  describe('border', () => {
    it('includes border-color', () => {
      expect(getPropertiesForCategory('border')).toContain('border-color');
    });

    it('includes border-width', () => {
      expect(getPropertiesForCategory('border')).toContain('border-width');
    });

    it('includes border-style', () => {
      expect(getPropertiesForCategory('border')).toContain('border-style');
    });

    it('includes border-top', () => {
      expect(getPropertiesForCategory('border')).toContain('border-top');
    });

    it('does NOT include border-radius (that is effects)', () => {
      expect(getPropertiesForCategory('border')).not.toContain('border-radius');
    });
  });

  // ── spacing ──────────────────────────────────────────────────────────

  describe('spacing', () => {
    it('includes padding', () => {
      expect(getPropertiesForCategory('spacing')).toContain('padding');
    });

    it('includes margin', () => {
      expect(getPropertiesForCategory('spacing')).toContain('margin');
    });

    it('includes padding-top', () => {
      expect(getPropertiesForCategory('spacing')).toContain('padding-top');
    });

    it('includes margin-bottom', () => {
      expect(getPropertiesForCategory('spacing')).toContain('margin-bottom');
    });
  });

  // ── sizing ───────────────────────────────────────────────────────────

  describe('sizing', () => {
    it('includes width', () => {
      expect(getPropertiesForCategory('sizing')).toContain('width');
    });

    it('includes height', () => {
      expect(getPropertiesForCategory('sizing')).toContain('height');
    });

    it('includes max-width', () => {
      expect(getPropertiesForCategory('sizing')).toContain('max-width');
    });

    it('includes min-height', () => {
      expect(getPropertiesForCategory('sizing')).toContain('min-height');
    });
  });

  // ── effects — derived from ENHANCE_PROPERTIES ────────────────────────

  describe('effects', () => {
    it('includes border-radius', () => {
      expect(getPropertiesForCategory('effects')).toContain('border-radius');
    });

    it('includes box-shadow', () => {
      expect(getPropertiesForCategory('effects')).toContain('box-shadow');
    });

    it('includes opacity', () => {
      expect(getPropertiesForCategory('effects')).toContain('opacity');
    });

    it('includes background-image', () => {
      expect(getPropertiesForCategory('effects')).toContain('background-image');
    });

    it('matches ENHANCE_PROPERTIES from classifier (no drift)', () => {
      const effects = getPropertiesForCategory('effects');
      for (const prop of ENHANCE_PROPERTIES) {
        expect(effects, `ENHANCE_PROPERTIES member '${prop}' missing from effects category`).toContain(prop);
      }
      expect(effects.length).toBe(ENHANCE_PROPERTIES.size);
    });
  });

  // ── layout — derived from ALWAYS_BREAKING ────────────────────────────

  describe('layout', () => {
    it('includes flex', () => {
      expect(getPropertiesForCategory('layout')).toContain('flex');
    });

    it('includes grid-template-columns', () => {
      expect(getPropertiesForCategory('layout')).toContain('grid-template-columns');
    });

    it('includes align-items', () => {
      expect(getPropertiesForCategory('layout')).toContain('align-items');
    });

    it('includes justify-content', () => {
      expect(getPropertiesForCategory('layout')).toContain('justify-content');
    });

    it('matches ALWAYS_BREAKING from classifier (no drift)', () => {
      const layout = getPropertiesForCategory('layout');
      for (const prop of ALWAYS_BREAKING) {
        expect(layout, `ALWAYS_BREAKING member '${prop}' missing from layout category`).toContain(prop);
      }
      expect(layout.length).toBe(ALWAYS_BREAKING.size);
    });
  });

  // ── display ──────────────────────────────────────────────────────────

  describe('display', () => {
    it('includes display', () => {
      expect(getPropertiesForCategory('display')).toContain('display');
    });

    it('includes position', () => {
      expect(getPropertiesForCategory('display')).toContain('position');
    });
  });

  // ── return type ───────────────────────────────────────────────────────

  it('returns a readonly array for every category', () => {
    const categories = getAllCategories();
    for (const cat of categories) {
      const props = getPropertiesForCategory(cat);
      expect(Array.isArray(props)).toBe(true);
    }
  });

  it('returns an empty array for unknown category', () => {
    // Cast to bypass TypeScript — simulates a runtime unknown value.
    const result = getPropertiesForCategory('unknown' as never);
    expect(result).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getCategoryForProperty
// ────────────────────────────────────────────────────────────────────────────

describe('getCategoryForProperty()', () => {
  beforeEach(() => {
    _resetCssCategoriesCache();
  });

  it('font-size → typography', () => {
    expect(getCategoryForProperty('font-size')).toBe('typography');
  });

  it('color → typography', () => {
    expect(getCategoryForProperty('color')).toBe('typography');
  });

  it('background-color → background', () => {
    expect(getCategoryForProperty('background-color')).toBe('background');
  });

  it('border-color → border', () => {
    expect(getCategoryForProperty('border-color')).toBe('border');
  });

  it('padding → spacing', () => {
    expect(getCategoryForProperty('padding')).toBe('spacing');
  });

  it('margin-top → spacing', () => {
    expect(getCategoryForProperty('margin-top')).toBe('spacing');
  });

  it('width → sizing', () => {
    expect(getCategoryForProperty('width')).toBe('sizing');
  });

  it('max-width → sizing', () => {
    expect(getCategoryForProperty('max-width')).toBe('sizing');
  });

  it('border-radius → effects', () => {
    expect(getCategoryForProperty('border-radius')).toBe('effects');
  });

  it('box-shadow → effects', () => {
    expect(getCategoryForProperty('box-shadow')).toBe('effects');
  });

  it('opacity → effects', () => {
    expect(getCategoryForProperty('opacity')).toBe('effects');
  });

  it('flex → layout', () => {
    expect(getCategoryForProperty('flex')).toBe('layout');
  });

  it('grid-template-columns → layout', () => {
    expect(getCategoryForProperty('grid-template-columns')).toBe('layout');
  });

  it('align-items → layout', () => {
    expect(getCategoryForProperty('align-items')).toBe('layout');
  });

  it('display → display', () => {
    expect(getCategoryForProperty('display')).toBe('display');
  });

  it('position → display', () => {
    expect(getCategoryForProperty('position')).toBe('display');
  });

  it('unknown property → undefined', () => {
    expect(getCategoryForProperty('webkit-tap-highlight-color')).toBeUndefined();
  });

  it('empty string → undefined', () => {
    expect(getCategoryForProperty('')).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getAllCategories
// ────────────────────────────────────────────────────────────────────────────

describe('getAllCategories()', () => {
  it('returns all 8 categories', () => {
    const cats = getAllCategories();
    expect(cats).toContain('typography');
    expect(cats).toContain('background');
    expect(cats).toContain('border');
    expect(cats).toContain('spacing');
    expect(cats).toContain('sizing');
    expect(cats).toContain('display');
    expect(cats).toContain('effects');
    expect(cats).toContain('layout');
    expect(cats.length).toBe(8);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// NO_EFFECT_PROPERTIES export — verify no drift with classifier
// ────────────────────────────────────────────────────────────────────────────

describe('NO_EFFECT_PROPERTIES', () => {
  it('matches ALWAYS_NO_EFFECT from classifier (no drift)', () => {
    for (const prop of ALWAYS_NO_EFFECT) {
      expect(NO_EFFECT_PROPERTIES, `ALWAYS_NO_EFFECT member '${prop}' missing`).toContain(prop);
    }
    expect(NO_EFFECT_PROPERTIES.length).toBe(ALWAYS_NO_EFFECT.size);
  });

  it('includes transition', () => {
    expect(NO_EFFECT_PROPERTIES).toContain('transition');
  });

  it('includes animation', () => {
    expect(NO_EFFECT_PROPERTIES).toContain('animation');
  });

  it('includes transform', () => {
    expect(NO_EFFECT_PROPERTIES).toContain('transform');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Cache reset
// ────────────────────────────────────────────────────────────────────────────

describe('_resetCssCategoriesCache()', () => {
  it('getCategoryForProperty still works after cache reset', () => {
    getCategoryForProperty('font-size'); // populate cache
    _resetCssCategoriesCache();
    expect(getCategoryForProperty('font-size')).toBe('typography');
  });
});
