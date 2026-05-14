import { describe, it, expect } from 'vitest';
import { deduplicateBySpecificity, serializeToInlineStyle } from '../../src/utils/specificity-dedup.js';
import type { CSSProperty } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helper — build a CSSProperty quickly
// ---------------------------------------------------------------------------
function p(property: string, value: string, specificity?: number): CSSProperty {
  return specificity === undefined ? { property, value } : { property, value, specificity };
}

// ---------------------------------------------------------------------------
// Basic rules
// ---------------------------------------------------------------------------

describe('deduplicateBySpecificity — basic rules', () => {
  it('single property passes through unchanged', () => {
    const result = deduplicateBySpecificity([p('color', 'red', 0)]);
    expect(result).toHaveLength(1);
    expect(result[0]?.value).toBe('red');
  });

  it('non-conflicting properties are all preserved', () => {
    const result = deduplicateBySpecificity([
      p('color', 'red', 0),
      p('font-size', '16px', 0),
      p('background-color', '#fff', 0),
    ]);
    expect(result).toHaveLength(3);
  });

  it('empty array returns empty array', () => {
    expect(deduplicateBySpecificity([])).toEqual([]);
  });

  it('missing specificity defaults to 0 — last wins', () => {
    const result = deduplicateBySpecificity([p('color', 'red'), p('color', 'blue')]);
    expect(result[0]?.value).toBe('blue');
  });
});

// ---------------------------------------------------------------------------
// Equal specificity → last wins
// ---------------------------------------------------------------------------

describe('deduplicateBySpecificity — equal specificity, last wins', () => {
  it('last of two equal-spec entries wins', () => {
    const result = deduplicateBySpecificity([
      p('margin-top', '12px', 0),
      p('margin-top', '20px', 0),
    ]);
    expect(result[0]?.value).toBe('20px');
  });

  it('last of three equal-spec entries wins', () => {
    const result = deduplicateBySpecificity([
      p('margin-top', '12px', 0),
      p('margin-top', '20px', 0),
      p('margin-top', '36px', 0),
    ]);
    expect(result[0]?.value).toBe('36px');
  });

  it('m-3 m-1 m-5 — all broad, last (m-5) wins on all sides', () => {
    const result = deduplicateBySpecificity([
      p('margin-top', '12px', 0), p('margin-right', '12px', 0),
      p('margin-bottom', '12px', 0), p('margin-left', '12px', 0),
      p('margin-top', '4px', 0), p('margin-right', '4px', 0),
      p('margin-bottom', '4px', 0), p('margin-left', '4px', 0),
      p('margin-top', '20px', 0), p('margin-right', '20px', 0),
      p('margin-bottom', '20px', 0), p('margin-left', '20px', 0),
    ]);
    const map = Object.fromEntries(result.map(r => [r.property, r.value]));
    expect(map['margin-top']).toBe('20px');
    expect(map['margin-right']).toBe('20px');
    expect(map['margin-bottom']).toBe('20px');
    expect(map['margin-left']).toBe('20px');
  });
});

// ---------------------------------------------------------------------------
// Higher specificity beats order
// ---------------------------------------------------------------------------

describe('deduplicateBySpecificity — specificity beats order', () => {
  it('high-spec BEFORE low-spec: high wins (mt-6 m-3)', () => {
    const result = deduplicateBySpecificity([
      p('margin-top', '24px', 1), // mt-6
      p('margin-top', '12px', 0), // m-3
    ]);
    expect(result[0]?.value).toBe('24px');
  });

  it('high-spec AFTER low-spec: high wins (m-3 mt-6)', () => {
    const result = deduplicateBySpecificity([
      p('margin-top', '12px', 0), // m-3
      p('margin-top', '24px', 1), // mt-6
    ]);
    expect(result[0]?.value).toBe('24px');
  });

  it('high-spec sandwiched between low-spec entries: high wins (m-3 mt-6 m-5)', () => {
    const result = deduplicateBySpecificity([
      p('margin-top', '12px', 0), // m-3
      p('margin-top', '24px', 1), // mt-6
      p('margin-top', '20px', 0), // m-5 — must NOT overwrite mt-6
    ]);
    expect(result[0]?.value).toBe('24px');
  });

  it('two high-spec entries: last high-spec wins (mt-6 mt-4)', () => {
    const result = deduplicateBySpecificity([
      p('margin-top', '24px', 1), // mt-6
      p('margin-top', '16px', 1), // mt-4 — wins because equal spec, last
    ]);
    expect(result[0]?.value).toBe('16px');
  });

  it('high-spec only affects its own property, others use last-wins', () => {
    const result = deduplicateBySpecificity([
      p('margin-top', '24px', 1),                                          // mt-6
      p('margin-top', '20px', 0), p('margin-right', '20px', 0),           // m-5
      p('margin-bottom', '20px', 0), p('margin-left', '20px', 0),
    ]);
    const map = Object.fromEntries(result.map(r => [r.property, r.value]));
    expect(map['margin-top']).toBe('24px');    // mt-6 wins
    expect(map['margin-right']).toBe('20px');  // m-5 wins (no competition)
    expect(map['margin-bottom']).toBe('20px');
    expect(map['margin-left']).toBe('20px');
  });
});

// ---------------------------------------------------------------------------
// Full pipeline traces — real class combinations
// ---------------------------------------------------------------------------

describe('deduplicateBySpecificity — full pipeline traces', () => {
  it('m-3 mt-4 mb-1 m-5', () => {
    const result = deduplicateBySpecificity([
      p('margin-top', '12px', 0), p('margin-right', '12px', 0),   // m-3
      p('margin-bottom', '12px', 0), p('margin-left', '12px', 0),
      p('margin-top', '16px', 1),                                  // mt-4
      p('margin-bottom', '4px', 1),                                // mb-1
      p('margin-top', '20px', 0), p('margin-right', '20px', 0),   // m-5
      p('margin-bottom', '20px', 0), p('margin-left', '20px', 0),
    ]);
    const map = Object.fromEntries(result.map(r => [r.property, r.value]));
    expect(map['margin-top']).toBe('16px');    // mt-4 wins (spec=1)
    expect(map['margin-right']).toBe('20px');  // m-5 wins (last equal-spec)
    expect(map['margin-bottom']).toBe('4px');  // mb-1 wins (spec=1)
    expect(map['margin-left']).toBe('20px');   // m-5 wins (last equal-spec)
  });

  it('mt-5 m-3 m-1 mb-4 m-[10px] m-[5px] m-9', () => {
    const result = deduplicateBySpecificity([
      p('margin-top', '20px', 1),                                          // mt-5
      p('margin-top', '12px', 0), p('margin-right', '12px', 0),           // m-3
      p('margin-bottom', '12px', 0), p('margin-left', '12px', 0),
      p('margin-top', '4px', 0), p('margin-right', '4px', 0),             // m-1
      p('margin-bottom', '4px', 0), p('margin-left', '4px', 0),
      p('margin-bottom', '16px', 1),                                       // mb-4
      p('margin-top', '10px', 0), p('margin-right', '10px', 0),           // m-[10px]
      p('margin-bottom', '10px', 0), p('margin-left', '10px', 0),
      p('margin-top', '5px', 0), p('margin-right', '5px', 0),             // m-[5px]
      p('margin-bottom', '5px', 0), p('margin-left', '5px', 0),
      p('margin-top', '36px', 0), p('margin-right', '36px', 0),           // m-9
      p('margin-bottom', '36px', 0), p('margin-left', '36px', 0),
    ]);
    const map = Object.fromEntries(result.map(r => [r.property, r.value]));
    expect(map['margin-top']).toBe('20px');    // mt-5 wins (spec=1, beats all spec=0)
    expect(map['margin-right']).toBe('36px');  // m-9 wins (last equal-spec=0)
    expect(map['margin-bottom']).toBe('16px'); // mb-4 wins (spec=1, beats all spec=0)
    expect(map['margin-left']).toBe('36px');   // m-9 wins (last equal-spec=0)
  });

  it('p-8 pt-2 pr-4 pb-2 pl-4 p-2 — explicit sides override broad then broad again', () => {
    const result = deduplicateBySpecificity([
      p('padding-top', '32px', 0), p('padding-right', '32px', 0),  // p-8
      p('padding-bottom', '32px', 0), p('padding-left', '32px', 0),
      p('padding-top', '8px', 1),                                   // pt-2
      p('padding-right', '16px', 1),                                // pr-4
      p('padding-bottom', '8px', 1),                                // pb-2
      p('padding-left', '16px', 1),                                 // pl-4
      p('padding-top', '8px', 0), p('padding-right', '8px', 0),    // p-2 — must NOT win
      p('padding-bottom', '8px', 0), p('padding-left', '8px', 0),
    ]);
    const map = Object.fromEntries(result.map(r => [r.property, r.value]));
    expect(map['padding-top']).toBe('8px');    // pt-2 wins
    expect(map['padding-right']).toBe('16px'); // pr-4 wins
    expect(map['padding-bottom']).toBe('8px'); // pb-2 wins
    expect(map['padding-left']).toBe('16px');  // pl-4 wins
  });

  it('px-4 py-2 p-8 — axis utilities are spec=0, broad p-8 is last, wins all', () => {
    const result = deduplicateBySpecificity([
      p('padding-left', '16px', 0), p('padding-right', '16px', 0),  // px-4
      p('padding-top', '8px', 0), p('padding-bottom', '8px', 0),    // py-2
      p('padding-top', '32px', 0), p('padding-right', '32px', 0),   // p-8
      p('padding-bottom', '32px', 0), p('padding-left', '32px', 0),
    ]);
    const map = Object.fromEntries(result.map(r => [r.property, r.value]));
    expect(map['padding-top']).toBe('32px');
    expect(map['padding-right']).toBe('32px');
    expect(map['padding-bottom']).toBe('32px');
    expect(map['padding-left']).toBe('32px');
  });

  it('unrelated properties never interfere with each other', () => {
    const result = deduplicateBySpecificity([
      p('margin-top', '20px', 1),
      p('padding-top', '16px', 0),
      p('color', 'red', 0),
      p('font-size', '14px', 0),
      p('color', 'blue', 0),
    ]);
    const map = Object.fromEntries(result.map(r => [r.property, r.value]));
    expect(map['margin-top']).toBe('20px');
    expect(map['padding-top']).toBe('16px');
    expect(map['color']).toBe('blue');
    expect(map['font-size']).toBe('14px');
    expect(result).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// serializeToInlineStyle
// ---------------------------------------------------------------------------

describe('serializeToInlineStyle', () => {
  it('single property', () => {
    expect(serializeToInlineStyle([p('color', 'red')])).toBe('color:red');
  });

  it('multiple properties joined with semicolons, no trailing semicolon', () => {
    const r = serializeToInlineStyle([p('color', 'red'), p('font-size', '16px')]);
    expect(r).toBe('color:red;font-size:16px');
    expect(r.endsWith(';')).toBe(false);
  });

  it('empty array returns empty string', () => {
    expect(serializeToInlineStyle([])).toBe('');
  });
});


describe('deduplicateBySpecificity', () => {
  it('keeps single property unchanged', () => {
    const result = deduplicateBySpecificity([{ property: 'color', value: 'red' }]);
    expect(result).toHaveLength(1);
    expect(result[0]?.value).toBe('red');
  });

  it('last wins when specificity is equal', () => {
    const result = deduplicateBySpecificity([
      { property: 'color', value: 'red', specificity: 0 },
      { property: 'color', value: 'blue', specificity: 0 },
    ]);
    expect(result[0]?.value).toBe('blue');
  });

  it('higher specificity beats earlier last-wins entry', () => {
    const result = deduplicateBySpecificity([
      { property: 'margin-top', value: '12px', specificity: 0 }, // m-3
      { property: 'margin-top', value: '24px', specificity: 1 }, // mt-6
      { property: 'margin-top', value: '20px', specificity: 0 }, // m-5 — should NOT win
    ]);
    expect(result[0]?.value).toBe('24px');
  });

  it('higher specificity beats later lower-specificity entry', () => {
    // mt-6 comes first, then m-3 — m-3 must NOT overwrite mt-6
    const result = deduplicateBySpecificity([
      { property: 'margin-top', value: '24px', specificity: 1 }, // mt-6
      { property: 'margin-top', value: '12px', specificity: 0 }, // m-3
    ]);
    expect(result[0]?.value).toBe('24px');
  });

  it('non-conflicting properties are all preserved', () => {
    const result = deduplicateBySpecificity([
      { property: 'margin-top', value: '12px', specificity: 0 },
      { property: 'margin-right', value: '12px', specificity: 0 },
      { property: 'margin-bottom', value: '12px', specificity: 0 },
      { property: 'margin-left', value: '12px', specificity: 0 },
    ]);
    expect(result).toHaveLength(4);
  });

  it('m-3 mt-4 mb-1 m-5 — full pipeline trace', () => {
    const props = [
      // m-3
      { property: 'margin-top',    value: '12px', specificity: 0 },
      { property: 'margin-right',  value: '12px', specificity: 0 },
      { property: 'margin-bottom', value: '12px', specificity: 0 },
      { property: 'margin-left',   value: '12px', specificity: 0 },
      // mt-4
      { property: 'margin-top',    value: '16px', specificity: 1 },
      // mb-1
      { property: 'margin-bottom', value: '4px',  specificity: 1 },
      // m-5
      { property: 'margin-top',    value: '20px', specificity: 0 },
      { property: 'margin-right',  value: '20px', specificity: 0 },
      { property: 'margin-bottom', value: '20px', specificity: 0 },
      { property: 'margin-left',   value: '20px', specificity: 0 },
    ];
    const result = deduplicateBySpecificity(props);
    const map = Object.fromEntries(result.map(p => [p.property, p.value]));
    expect(map['margin-top']).toBe('16px');    // mt-4 wins (spec=1)
    expect(map['margin-right']).toBe('20px');  // m-5 wins (last equal-spec)
    expect(map['margin-bottom']).toBe('4px');  // mb-1 wins (spec=1)
    expect(map['margin-left']).toBe('20px');   // m-5 wins (last equal-spec)
  });

  it('missing specificity defaults to 0', () => {
    const result = deduplicateBySpecificity([
      { property: 'color', value: 'red' },     // no specificity field
      { property: 'color', value: 'blue' },    // no specificity field
    ]);
    expect(result[0]?.value).toBe('blue'); // last wins at equal spec=0
  });
});

describe('serializeToInlineStyle', () => {
  it('produces semicolon-separated declarations', () => {
    const result = serializeToInlineStyle([
      { property: 'color', value: 'red' },
      { property: 'font-size', value: '16px' },
    ]);
    expect(result).toBe('color:red;font-size:16px');
  });

  it('returns empty string for empty array', () => {
    expect(serializeToInlineStyle([])).toBe('');
  });
});
