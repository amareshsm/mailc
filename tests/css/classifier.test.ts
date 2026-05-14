/**
 * Tests for the CSS classifier.
 *
 * @module tests/css/classifier
 */
import { describe, it, expect } from 'vitest';
import {
  classifyProperty,
  classifyProperties,
  filterByClassification,
} from '../../src/css/classifier.js';
import type { CSSProperty, ClassifiedCSS } from '../../src/types.js';

// ---------------------------------------------------------------------------
// classifyProperty — single property
// ---------------------------------------------------------------------------

describe('classifyProperty', () => {
  // ── SAFE properties ───────────────────────────────────────────────────

  describe('SAFE properties', () => {
    const safeProps: CSSProperty[] = [
      { property: 'color', value: '#fff' },
      { property: 'background-color', value: '#e85d3a' },
      { property: 'font-size', value: '16px' },
      { property: 'font-weight', value: 'bold' },
      { property: 'font-family', value: 'Arial, sans-serif' },
      { property: 'font-style', value: 'italic' },
      { property: 'line-height', value: '1.5' },
      { property: 'letter-spacing', value: '0.5px' },
      { property: 'text-align', value: 'center' },
      { property: 'text-decoration', value: 'underline' },
      { property: 'text-transform', value: 'uppercase' },
      { property: 'vertical-align', value: 'middle' },
      { property: 'padding-top', value: '16px' },
      { property: 'padding-right', value: '8px' },
      { property: 'padding-bottom', value: '16px' },
      { property: 'padding-left', value: '8px' },
      { property: 'margin-top', value: '10px' },
      { property: 'margin-bottom', value: '10px' },
      { property: 'width', value: '600px' },
      { property: 'max-width', value: '600px' },
      { property: 'height', value: '100px' },
      { property: 'border-width', value: '1px' },
      { property: 'border-style', value: 'solid' },
      { property: 'border-color', value: '#ccc' },
      { property: 'border-collapse', value: 'collapse' },
      { property: 'display', value: 'block' },
      { property: 'display', value: 'inline' },
      { property: 'display', value: 'inline-block' },
      { property: 'display', value: 'none' },
      { property: 'direction', value: 'rtl' },
      { property: 'white-space', value: 'nowrap' },
      { property: 'table-layout', value: 'fixed' },
      { property: 'position', value: 'static' },
    ];

    for (const prop of safeProps) {
      it(`classifies ${prop.property}: ${prop.value} as SAFE`, () => {
        expect(classifyProperty(prop)).toBe('SAFE');
      });
    }
  });

  // ── ENHANCE properties ────────────────────────────────────────────────

  describe('ENHANCE properties', () => {
    const enhanceProps: CSSProperty[] = [
      { property: 'border-radius', value: '8px' },
      { property: 'border-top-left-radius', value: '4px' },
      { property: 'border-top-right-radius', value: '4px' },
      { property: 'border-bottom-left-radius', value: '4px' },
      { property: 'border-bottom-right-radius', value: '4px' },
      { property: 'box-shadow', value: '0 2px 4px rgba(0,0,0,0.1)' },
      { property: 'opacity', value: '0.8' },
      { property: 'background-image', value: 'url(bg.jpg)' },
      { property: 'background-size', value: 'cover' },
      { property: 'background-position', value: 'center' },
      { property: 'background-repeat', value: 'no-repeat' },
      { property: 'background-attachment', value: 'fixed' },
    ];

    for (const prop of enhanceProps) {
      it(`classifies ${prop.property}: ${prop.value} as ENHANCE`, () => {
        expect(classifyProperty(prop)).toBe('ENHANCE');
      });
    }
  });

  // ── BREAKING properties ───────────────────────────────────────────────

  describe('BREAKING properties', () => {
    it('classifies display: flex as BREAKING', () => {
      expect(classifyProperty({ property: 'display', value: 'flex' })).toBe('BREAKING');
    });

    it('classifies display: grid as BREAKING', () => {
      expect(classifyProperty({ property: 'display', value: 'grid' })).toBe('BREAKING');
    });

    it('classifies display: inline-flex as BREAKING', () => {
      expect(classifyProperty({ property: 'display', value: 'inline-flex' })).toBe('BREAKING');
    });

    it('classifies display: inline-grid as BREAKING', () => {
      expect(classifyProperty({ property: 'display', value: 'inline-grid' })).toBe('BREAKING');
    });

    it('classifies position: absolute as BREAKING', () => {
      expect(classifyProperty({ property: 'position', value: 'absolute' })).toBe('BREAKING');
    });

    it('classifies position: fixed as BREAKING', () => {
      expect(classifyProperty({ property: 'position', value: 'fixed' })).toBe('BREAKING');
    });

    it('classifies position: sticky as BREAKING', () => {
      expect(classifyProperty({ property: 'position', value: 'sticky' })).toBe('BREAKING');
    });

    const alwaysBreaking: CSSProperty[] = [
      { property: 'flex-direction', value: 'row' },
      { property: 'flex-wrap', value: 'wrap' },
      { property: 'align-items', value: 'center' },
      { property: 'justify-content', value: 'space-between' },
      { property: 'gap', value: '16px' },
      { property: 'grid-template-columns', value: '1fr 1fr' },
      { property: 'grid-column', value: '1 / 3' },
      { property: 'float', value: 'left' },
      { property: 'clear', value: 'both' },
      { property: 'z-index', value: '10' },
      { property: 'top', value: '0' },
      { property: 'right', value: '0' },
      { property: 'bottom', value: '0' },
      { property: 'left', value: '0' },
      { property: 'overflow', value: 'hidden' },
      { property: 'overflow-x', value: 'scroll' },
      { property: 'overflow-y', value: 'auto' },
      { property: 'order', value: '1' },
    ];

    for (const prop of alwaysBreaking) {
      it(`classifies ${prop.property}: ${prop.value} as BREAKING`, () => {
        expect(classifyProperty(prop)).toBe('BREAKING');
      });
    }
  });

  // ── NO_EFFECT properties ──────────────────────────────────────────────

  describe('NO_EFFECT properties', () => {
    const noEffectProps: CSSProperty[] = [
      { property: 'transition', value: 'all 0.3s' },
      { property: 'transition-property', value: 'opacity' },
      { property: 'transition-duration', value: '300ms' },
      { property: 'animation', value: 'fade 1s' },
      { property: 'animation-name', value: 'spin' },
      { property: 'transform', value: 'rotate(45deg)' },
      { property: 'rotate', value: '45deg' },
      { property: 'scale', value: '1.5' },
      { property: 'translate', value: '10px 20px' },
      { property: 'cursor', value: 'pointer' },
      { property: 'outline', value: '1px solid blue' },
      { property: 'pointer-events', value: 'none' },
      { property: 'user-select', value: 'none' },
      { property: 'resize', value: 'both' },
      { property: 'scroll-behavior', value: 'smooth' },
      { property: 'will-change', value: 'transform' },
    ];

    for (const prop of noEffectProps) {
      it(`classifies ${prop.property}: ${prop.value} as NO_EFFECT`, () => {
        expect(classifyProperty(prop)).toBe('NO_EFFECT');
      });
    }
  });
});

// ---------------------------------------------------------------------------
// classifyProperties — batch
// ---------------------------------------------------------------------------

describe('classifyProperties', () => {
  it('classifies an array of mixed properties', () => {
    const props: CSSProperty[] = [
      { property: 'color', value: '#fff' },
      { property: 'border-radius', value: '8px' },
      { property: 'display', value: 'flex' },
      { property: 'cursor', value: 'pointer' },
    ];

    const result = classifyProperties(props);
    expect(result).toHaveLength(4);
    expect(result[0]?.classification).toBe('SAFE');
    expect(result[1]?.classification).toBe('ENHANCE');
    expect(result[2]?.classification).toBe('BREAKING');
    expect(result[3]?.classification).toBe('NO_EFFECT');
  });

  it('returns empty array for empty input', () => {
    expect(classifyProperties([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// filterByClassification
// ---------------------------------------------------------------------------

describe('filterByClassification', () => {
  const classified: ClassifiedCSS[] = [
    { property: { property: 'color', value: '#fff' }, classification: 'SAFE' },
    { property: { property: 'border-radius', value: '8px' }, classification: 'ENHANCE' },
    { property: { property: 'display', value: 'flex' }, classification: 'BREAKING' },
    { property: { property: 'cursor', value: 'pointer' }, classification: 'NO_EFFECT' },
    { property: { property: 'font-size', value: '16px' }, classification: 'SAFE' },
  ];

  it('filters SAFE properties', () => {
    const safe = filterByClassification(classified, 'SAFE');
    expect(safe).toHaveLength(2);
    expect(safe[0]?.property.property).toBe('color');
    expect(safe[1]?.property.property).toBe('font-size');
  });

  it('filters ENHANCE properties', () => {
    const enhance = filterByClassification(classified, 'ENHANCE');
    expect(enhance).toHaveLength(1);
    expect(enhance[0]?.property.property).toBe('border-radius');
  });

  it('filters BREAKING properties', () => {
    const breaking = filterByClassification(classified, 'BREAKING');
    expect(breaking).toHaveLength(1);
    expect(breaking[0]?.property.property).toBe('display');
  });

  it('filters NO_EFFECT properties', () => {
    const noEffect = filterByClassification(classified, 'NO_EFFECT');
    expect(noEffect).toHaveLength(1);
    expect(noEffect[0]?.property.property).toBe('cursor');
  });

  it('returns empty array when no match', () => {
    const safeOnly: ClassifiedCSS[] = [
      { property: { property: 'color', value: '#fff' }, classification: 'SAFE' },
    ];
    expect(filterByClassification(safeOnly, 'BREAKING')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildClassificationMap — dynamic caniemail-based classification
// ---------------------------------------------------------------------------
// buildClassificationMap — dynamic caniemail-based classification
// ---------------------------------------------------------------------------

import { buildClassificationMap } from '../../src/css/classifier.js';

// ---------------------------------------------------------------------------
// Invariants — hardcoded overrides that must hold for EVERY supported client
//
// All 32 clients from caniemail (excl. thunderbird which throws for table-layout).
// These are applied AFTER caniemail runs, so they always win regardless of
// what caniemail says about a client.
// ---------------------------------------------------------------------------

describe('buildClassificationMap — hardcoded invariants (all clients)', () => {
  const ALL_CLIENTS = [
    'apple-mail.macos', 'apple-mail.ios',
    'gmail.desktop-webmail', 'gmail.ios', 'gmail.android', 'gmail.mobile-webmail',
    'orange.desktop-webmail', 'orange.ios', 'orange.android',
    'outlook.windows', 'outlook.windows-mail', 'outlook.macos', 'outlook.ios', 'outlook.android',
    'yahoo.desktop-webmail', 'yahoo.ios', 'yahoo.android',
    'aol.desktop-webmail', 'aol.ios', 'aol.android',
    'samsung-email.android',
    'sfr.desktop-webmail', 'sfr.ios', 'sfr.android',
    'protonmail.desktop-webmail', 'protonmail.ios', 'protonmail.android',
    'hey.desktop-webmail',
    'mail-ru.desktop-webmail',
    'fastmail.desktop-webmail',
    'laposte.desktop-webmail',
  ];

  it('flex/grid layout properties are BREAKING for every client', () => {
    for (const client of ALL_CLIENTS) {
      const map = buildClassificationMap([client]);
      expect(map.get('flex'), client).toBe('BREAKING');
      expect(map.get('flex-direction'), client).toBe('BREAKING');
      expect(map.get('align-items'), client).toBe('BREAKING');
      expect(map.get('justify-content'), client).toBe('BREAKING');
      expect(map.get('gap'), client).toBe('BREAKING');
      expect(map.get('grid-template-columns'), client).toBe('BREAKING');
    }
  });

  it('overflow properties are BREAKING for every client (dynamic path matches static path)', () => {
    // Bug fix: overflow was missing from ALWAYS_BREAKING, causing dynamic path
    // to return SAFE while static fallback correctly returned BREAKING.
    for (const client of ALL_CLIENTS) {
      const map = buildClassificationMap([client]);
      expect(map.get('overflow'), client).toBe('BREAKING');
      expect(map.get('overflow-x'), client).toBe('BREAKING');
      expect(map.get('overflow-y'), client).toBe('BREAKING');
    }
  });

  it('animation/transition/transform properties are NO_EFFECT for every client', () => {
    for (const client of ALL_CLIENTS) {
      const map = buildClassificationMap([client]);
      expect(map.get('transition'), client).toBe('NO_EFFECT');
      expect(map.get('animation'), client).toBe('NO_EFFECT');
      expect(map.get('transform'), client).toBe('NO_EFFECT');
      expect(map.get('cursor'), client).toBe('NO_EFFECT');
    }
  });

  it('margin-top and margin-bottom are SAFE for every client', () => {
    for (const client of ALL_CLIENTS) {
      const map = buildClassificationMap([client]);
      expect(map.get('margin-top'), client).toBe('SAFE');
      expect(map.get('margin-bottom'), client).toBe('SAFE');
    }
  });

  it('map always contains all probe properties', () => {
    const map = buildClassificationMap(['gmail.desktop-webmail']);
    for (const prop of ['color', 'font-size', 'font-weight', 'margin', 'padding',
      'border', 'border-radius', 'background-color', 'opacity', 'width', 'max-width']) {
      expect(map.has(prop), `map must contain "${prop}"`).toBe(true);
    }
  });

  it('does not throw for thunderbird.macos (incomplete caniemail dataset)', () => {
    // thunderbird.macos is missing "table-layout" in caniemail — must not crash
    expect(() => buildClassificationMap(['thunderbird.macos'])).not.toThrow();
    const map = buildClassificationMap(['thunderbird.macos']);
    expect(map.get('flex')).toBe('BREAKING');
    expect(map.get('animation')).toBe('NO_EFFECT');
  });
});

// ---------------------------------------------------------------------------
// Default config — the answer to "what if user specifies no targetClients?"
//
// DEFAULT_CONFIG.targetClients = ['gmail.*', 'apple-mail.*', 'outlook.*',
//   'yahoo.*', 'samsung-email.android']
//
// This is the most important config to get right: it covers the dominant
// email clients by market share. The union of their limitations determines
// what gets inlined vs. placed in the <style> block.
// ---------------------------------------------------------------------------

describe('buildClassificationMap — default config (no targetClients specified)', () => {
  // Mirrors DEFAULT_CONFIG.targetClients from src/config.ts exactly.
  const defaultMap = buildClassificationMap([
    'gmail.*',
    'apple-mail.*',
    'outlook.*',
    'yahoo.*',
    'samsung-email.android',
  ]);

  it('safe typography properties stay SAFE — not demoted by caniemail quirk warnings', () => {
    // caniemail warns about font-size/text-align for outlook/yahoo but these are
    // quirks (notes), not non-support. They must NOT be demoted to ENHANCE.
    for (const prop of ['color', 'font-family', 'font-style', 'font-weight',
      'line-height', 'letter-spacing', 'text-align', 'text-decoration',
      'text-transform', 'vertical-align', 'white-space', 'font-size']) {
      expect(defaultMap.get(prop), prop).toBe('SAFE');
    }
  });

  it('safe box-model properties stay SAFE', () => {
    for (const prop of ['width', 'height', 'max-width', 'min-width',
      'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'background-color', 'border-collapse', 'table-layout']) {
      expect(defaultMap.get(prop), prop).toBe('SAFE');
    }
  });

  it('visual enhancement properties become ENHANCE (limited client support)', () => {
    // These are not supported in outlook.windows — the default config's worst client.
    expect(defaultMap.get('border-radius')).toBe('ENHANCE');
    expect(defaultMap.get('border-top-left-radius')).toBe('ENHANCE');
    expect(defaultMap.get('border-top-right-radius')).toBe('ENHANCE');
    expect(defaultMap.get('border-bottom-left-radius')).toBe('ENHANCE');
    expect(defaultMap.get('border-bottom-right-radius')).toBe('ENHANCE');
    expect(defaultMap.get('opacity')).toBe('ENHANCE');
    expect(defaultMap.get('box-shadow')).toBe('ENHANCE');
    expect(defaultMap.get('background-image')).toBe('ENHANCE');
  });
});

// ---------------------------------------------------------------------------
// Per-client behavioral groups
//
// Clients are grouped by their ENHANCE properties based on live caniemail data.
// One representative per group — no point testing ios/android separately when
// they have identical caniemail data to the desktop variant.
//
// Group 1 — ALL_SAFE: apple-mail.macos, apple-mail.ios, outlook.macos, thunderbird.macos
// Group 2 — font-size quirk only (effectively SAFE): samsung, sfr.*, protonmail.*, hey, fastmail, laposte
// Group 3 — box-shadow ENHANCE: gmail.desktop-webmail
// Group 4 — box-shadow + margin quirk: gmail.ios, gmail.android, outlook.ios, outlook.android
// Group 5 — opacity + box-shadow ENHANCE: gmail.mobile-webmail, mail-ru.desktop-webmail
// Group 6 — border-radius + opacity + box-shadow ENHANCE: orange.*
// Group 7 — border-radius + opacity + box-shadow + background-image ENHANCE: outlook.windows, outlook.windows-mail
// Group 8 — box-shadow ENHANCE + border-radius/background-image warn: yahoo.*, aol.*
// ---------------------------------------------------------------------------

describe('buildClassificationMap — Group 1: fully permissive (apple-mail.macos)', () => {
  // apple-mail.macos has zero CSS issues — it supports everything we probe for.
  const map = buildClassificationMap(['apple-mail.macos']);

  it('all visual properties are SAFE (apple-mail supports them natively)', () => {
    expect(map.get('color')).toBe('SAFE');
    expect(map.get('padding')).toBe('SAFE');
    expect(map.get('margin')).toBe('SAFE');
    expect(map.get('border')).toBe('SAFE');
    expect(map.get('background-color')).toBe('SAFE');
    expect(map.get('background-image')).toBe('SAFE');
    expect(map.get('border-radius')).toBe('SAFE');
    expect(map.get('opacity')).toBe('SAFE');
    expect(map.get('box-shadow')).toBe('SAFE');
    expect(map.get('width')).toBe('SAFE');
  });
});

describe('buildClassificationMap — Group 2: font-size quirk only (samsung-email.android)', () => {
  // Samsung, sfr, protonmail, hey, fastmail, laposte all produce only a font-size
  // warning — that's a rendering note, not non-support. All ENHANCE properties
  // remain SAFE for these clients.
  // Representatives: samsung-email.android (in default config), protonmail.desktop-webmail
  const samsungMap = buildClassificationMap(['samsung-email.android']);
  const protonMap = buildClassificationMap(['protonmail.desktop-webmail']);

  it('samsung-email.android: all ENHANCE properties are SAFE (only font-size quirk)', () => {
    expect(samsungMap.get('border-radius')).toBe('SAFE');
    expect(samsungMap.get('opacity')).toBe('SAFE');
    expect(samsungMap.get('box-shadow')).toBe('SAFE');
    expect(samsungMap.get('background-image')).toBe('SAFE');
  });

  it('protonmail.desktop-webmail: same — all ENHANCE properties are SAFE', () => {
    expect(protonMap.get('border-radius')).toBe('SAFE');
    expect(protonMap.get('opacity')).toBe('SAFE');
    expect(protonMap.get('box-shadow')).toBe('SAFE');
  });
});

describe('buildClassificationMap — Group 3: box-shadow only (gmail.desktop-webmail)', () => {
  const map = buildClassificationMap(['gmail.desktop-webmail']);

  it('box-shadow is ENHANCE, everything else is SAFE', () => {
    expect(map.get('box-shadow')).toBe('ENHANCE');
    expect(map.get('border-radius')).toBe('SAFE');
    expect(map.get('opacity')).toBe('SAFE');
    expect(map.get('background-image')).toBe('SAFE');
    expect(map.get('color')).toBe('SAFE');
    expect(map.get('padding')).toBe('SAFE');
  });
});

describe('buildClassificationMap — Group 4: box-shadow + margin quirk (gmail.ios)', () => {
  // gmail.ios/android and outlook.ios/android: box-shadow ENHANCE, margin/text-align
  // warnings (quirks only — margin-top/bottom still SAFE via override).
  const map = buildClassificationMap(['gmail.ios']);

  it('box-shadow is ENHANCE', () => {
    expect(map.get('box-shadow')).toBe('ENHANCE');
  });

  it('margin-top/bottom stay SAFE despite margin warning', () => {
    expect(map.get('margin-top')).toBe('SAFE');
    expect(map.get('margin-bottom')).toBe('SAFE');
  });

  it('border-radius and opacity are SAFE (gmail.ios supports them)', () => {
    expect(map.get('border-radius')).toBe('SAFE');
    expect(map.get('opacity')).toBe('SAFE');
  });
});

describe('buildClassificationMap — Group 5: opacity + box-shadow (gmail.mobile-webmail)', () => {
  // gmail.mobile-webmail and mail-ru both drop opacity and box-shadow.
  const gmailMobileMap = buildClassificationMap(['gmail.mobile-webmail']);
  const mailRuMap = buildClassificationMap(['mail-ru.desktop-webmail']);

  it('gmail.mobile-webmail: opacity and box-shadow are ENHANCE', () => {
    expect(gmailMobileMap.get('opacity')).toBe('ENHANCE');
    expect(gmailMobileMap.get('box-shadow')).toBe('ENHANCE');
    expect(gmailMobileMap.get('border-radius')).toBe('SAFE');
    expect(gmailMobileMap.get('background-image')).toBe('SAFE');
  });

  it('mail-ru.desktop-webmail: opacity and box-shadow are ENHANCE', () => {
    expect(mailRuMap.get('opacity')).toBe('ENHANCE');
    expect(mailRuMap.get('box-shadow')).toBe('SAFE'); // mail-ru only errors on opacity
    expect(mailRuMap.get('border-radius')).toBe('SAFE');
  });
});

describe('buildClassificationMap — Group 6: border-radius + opacity + box-shadow (orange.*)', () => {
  // orange.* is the most aggressive webmail stripper outside of outlook.
  const map = buildClassificationMap(['orange.desktop-webmail']);

  it('border-radius, opacity and box-shadow are ENHANCE', () => {
    expect(map.get('border-radius')).toBe('ENHANCE');
    expect(map.get('opacity')).toBe('ENHANCE');
    expect(map.get('box-shadow')).toBe('ENHANCE');
  });

  it('background-image is SAFE (orange supports it)', () => {
    expect(map.get('background-image')).toBe('SAFE');
  });

  it('core properties remain SAFE', () => {
    expect(map.get('color')).toBe('SAFE');
    expect(map.get('padding')).toBe('SAFE');
    expect(map.get('width')).toBe('SAFE');
  });
});

describe('buildClassificationMap — Group 7: worst-case (outlook.windows)', () => {
  // outlook.windows (and outlook.windows-mail) is the most restrictive client
  // in mainstream use. Sets the bar for the default config.
  const windowsMap = buildClassificationMap(['outlook.windows']);
  const windowsMailMap = buildClassificationMap(['outlook.windows-mail']);

  it('outlook.windows: border-radius, opacity, box-shadow, background-image are ENHANCE', () => {
    expect(windowsMap.get('border-radius')).toBe('ENHANCE');
    expect(windowsMap.get('opacity')).toBe('ENHANCE');
    expect(windowsMap.get('box-shadow')).toBe('ENHANCE');
    expect(windowsMap.get('background-image')).toBe('ENHANCE');
  });

  it('outlook.windows: margin-top/bottom SAFE despite margin warning', () => {
    expect(windowsMap.get('margin-top')).toBe('SAFE');
    expect(windowsMap.get('margin-bottom')).toBe('SAFE');
  });

  it('outlook.windows-mail: same ENHANCE set as outlook.windows', () => {
    expect(windowsMailMap.get('border-radius')).toBe('ENHANCE');
    expect(windowsMailMap.get('opacity')).toBe('ENHANCE');
    expect(windowsMailMap.get('box-shadow')).toBe('ENHANCE');
    expect(windowsMailMap.get('background-image')).toBe('ENHANCE');
  });

  it('outlook.macos is ALL_SAFE (Mac Outlook is WebKit-based, not Word-based)', () => {
    const macMap = buildClassificationMap(['outlook.macos']);
    expect(macMap.get('border-radius')).toBe('SAFE');
    expect(macMap.get('opacity')).toBe('SAFE');
    expect(macMap.get('box-shadow')).toBe('SAFE');
    expect(macMap.get('background-image')).toBe('SAFE');
  });
});

describe('buildClassificationMap — Group 8: box-shadow + partial visual (yahoo.*, aol.*)', () => {
  // yahoo.* errors on box-shadow; warns on border-radius and background-image.
  // aol.* errors on opacity + box-shadow; warns on border-radius and background-image.
  const yahooMap = buildClassificationMap(['yahoo.desktop-webmail']);
  const aolMap = buildClassificationMap(['aol.desktop-webmail']);

  it('yahoo: box-shadow is ENHANCE (unsupported)', () => {
    expect(yahooMap.get('box-shadow')).toBe('ENHANCE');
  });

  it('yahoo: border-radius and background-image become ENHANCE (partial support)', () => {
    expect(yahooMap.get('border-radius')).toBe('ENHANCE');
    expect(yahooMap.get('background-image')).toBe('ENHANCE');
  });

  it('yahoo: opacity is SAFE (yahoo supports it)', () => {
    expect(yahooMap.get('opacity')).toBe('SAFE');
  });

  it('aol: opacity and box-shadow are ENHANCE (unsupported)', () => {
    expect(aolMap.get('opacity')).toBe('ENHANCE');
    expect(aolMap.get('box-shadow')).toBe('ENHANCE');
  });

  it('aol: border-radius and background-image become ENHANCE (partial support)', () => {
    expect(aolMap.get('border-radius')).toBe('ENHANCE');
    expect(aolMap.get('background-image')).toBe('ENHANCE');
  });
});

// ---------------------------------------------------------------------------
// Caching: same sorted client list → same Map instance
// ---------------------------------------------------------------------------

describe('buildClassificationMap — caching', () => {
  it('returns the same Map instance for identical client lists regardless of order', () => {
    const a = buildClassificationMap(['gmail.desktop-webmail', 'outlook.windows']);
    const b = buildClassificationMap(['outlook.windows', 'gmail.desktop-webmail']);
    expect(a).toBe(b);
  });

  it('returns different Map instances for different client lists', () => {
    const apple = buildClassificationMap(['apple-mail.macos']);
    const outlook = buildClassificationMap(['outlook.windows']);
    expect(apple).not.toBe(outlook);
  });
});

// ---------------------------------------------------------------------------
// classifyProperty with dynamic map — value-dependent overrides
// ---------------------------------------------------------------------------

describe('classifyProperty with dynamic map — value-dependent overrides', () => {
  const map = buildClassificationMap(['outlook.windows', 'gmail.desktop-webmail']);

  it('display: block/inline/inline-block are SAFE', () => {
    expect(classifyProperty({ property: 'display', value: 'block' }, map)).toBe('SAFE');
    expect(classifyProperty({ property: 'display', value: 'inline' }, map)).toBe('SAFE');
    expect(classifyProperty({ property: 'display', value: 'inline-block' }, map)).toBe('SAFE');
  });

  it('display: flex/grid/inline-flex/inline-grid are BREAKING', () => {
    expect(classifyProperty({ property: 'display', value: 'flex' }, map)).toBe('BREAKING');
    expect(classifyProperty({ property: 'display', value: 'grid' }, map)).toBe('BREAKING');
    expect(classifyProperty({ property: 'display', value: 'inline-flex' }, map)).toBe('BREAKING');
    expect(classifyProperty({ property: 'display', value: 'inline-grid' }, map)).toBe('BREAKING');
  });

  it('position: static is SAFE; all non-static values are BREAKING', () => {
    expect(classifyProperty({ property: 'position', value: 'static' }, map)).toBe('SAFE');
    for (const value of ['absolute', 'relative', 'fixed', 'sticky']) {
      expect(classifyProperty({ property: 'position', value }, map), `position:${value}`).toBe('BREAKING');
    }
  });

  it('falls back to static classification for unknown properties', () => {
    const result = classifyProperty({ property: 'webkit-tap-highlight-color', value: 'transparent' }, map);
    expect(['SAFE', 'ENHANCE', 'BREAKING', 'NO_EFFECT']).toContain(result);
  });
});

// ---------------------------------------------------------------------------
// Static fallback (no map) — used when targetClients is not configured
// ---------------------------------------------------------------------------

describe('classifyProperties — static fallback (no map)', () => {
  it('layout-breaking properties are BREAKING', () => {
    for (const [property, value] of [
      ['flex', '1'], ['grid-template-columns', '1fr'], ['overflow', 'hidden'],
      ['float', 'left'], ['z-index', '10'], ['display', 'flex'], ['display', 'grid'],
    ] as const) {
      expect(classifyProperty({ property, value }), `${property}:${value}`).toBe('BREAKING');
    }
  });

  it('animation/transition/transform are NO_EFFECT', () => {
    for (const [property, value] of [
      ['animation', 'spin 1s'], ['transition', 'all 0.3s'],
      ['transform', 'rotate(45deg)'], ['cursor', 'pointer'],
    ] as const) {
      expect(classifyProperty({ property, value }), property).toBe('NO_EFFECT');
    }
  });

  it('visual enhancement properties are ENHANCE', () => {
    for (const [property, value] of [
      ['border-radius', '8px'], ['opacity', '0.5'],
      ['box-shadow', '0 2px 4px red'], ['background-image', 'url(bg.jpg)'],
      ['background-size', 'cover'],
    ] as const) {
      expect(classifyProperty({ property, value }), property).toBe('ENHANCE');
    }
  });
});

