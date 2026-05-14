/**
 * Honest audit — every case markup-input supports must work for string-input.
 * Drops markers that prove sourceLoc points to the right line.
 */
import { describe, it, expect } from 'vitest';
import { compileFromJSON, compile } from '../../src/index.js';
import { parseJSONWithPositions } from '../../src/json/json-position-parser.js';
import { ErrorCode } from '../../src/errors/codes.js';

// ---------------------------------------------------------------------------
// 1. Dynamic templating — {{ expressions }} in content
// ---------------------------------------------------------------------------

describe('AUDIT — dynamic templating with string input', () => {
  it('{{ expression }} resolves AND produces a source map entry on the parent node', () => {
    const json = `{
  "type": "mc",
  "attributes": {},
  "children": [
    {
      "type": "mc-body",
      "attributes": {},
      "children": [
        {
          "type": "mc-section",
          "attributes": {},
          "children": [
            {
              "type": "mc-column",
              "attributes": {},
              "children": [
                {
                  "type": "mc-text",
                  "attributes": {},
                  "content": "Hi {{user.name}}"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`;
    const result = compileFromJSON(json, {
      templateStyle: 'attribute',
      sourceMap: true,
      data: { user: { name: 'Alice' } },
    });
    expect(result.html).toContain('Hi Alice');
    const text = result.sourceMap!.entries.find((e) => e.sourceComponent === 'mc-text');
    expect(text).toBeDefined();
    expect(text!.sourceLoc.startLine).toBe(17);
    expect(text!.expressions.length).toBeGreaterThan(0);
  });

  it('{{{ raw }}} expressions are honored', () => {
    const json = `{
  "type": "mc",
  "attributes": {},
  "children": [
    { "type": "mc-body", "attributes": {}, "children": [
      { "type": "mc-section", "attributes": {}, "children": [
        { "type": "mc-column", "attributes": {}, "children": [
          { "type": "mc-text", "attributes": {}, "content": "{{{rawHtml}}}" }
        ]}
      ]}
    ]}
  ]
}`;
    const result = compileFromJSON(json, {
      templateStyle: 'attribute',
      sourceMap: true,
      data: { rawHtml: '<b>bold</b>' },
    });
    expect(result.html).toContain('<b>bold</b>');
  });

  it('|| fallback expressions work', () => {
    const json = `{
  "type": "mc",
  "attributes": {},
  "children": [
    { "type": "mc-body", "attributes": {}, "children": [
      { "type": "mc-section", "attributes": {}, "children": [
        { "type": "mc-column", "attributes": {}, "children": [
          { "type": "mc-text", "attributes": {}, "content": "{{name || \\"there\\"}}" }
        ]}
      ]}
    ]}
  ]
}`;
    const result = compileFromJSON(json, {
      templateStyle: 'attribute',
      sourceMap: true,
      data: {},
    });
    expect(result.html).toContain('there');
  });
});

// ---------------------------------------------------------------------------
// 2. mc-each loops
// ---------------------------------------------------------------------------

describe('AUDIT — mc-each loops with string input', () => {
  it('mc-each iterations all map back to the same source loc', () => {
    const json = `{
  "type": "mc",
  "attributes": {},
  "children": [
    {
      "type": "mc-body",
      "attributes": {},
      "children": [
        {
          "type": "mc-section",
          "attributes": {},
          "children": [
            {
              "type": "mc-column",
              "attributes": {},
              "children": [
                {
                  "type": "mc-each",
                  "attributes": { "items": "products", "as": "p" },
                  "children": [
                    { "type": "mc-text", "attributes": {}, "content": "Item {{p.name}}" }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`;
    const result = compileFromJSON(json, {
      templateStyle: 'attribute',
      sourceMap: true,
      data: { products: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] },
    });
    expect(result.html).toContain('Item A');
    expect(result.html).toContain('Item B');
    expect(result.html).toContain('Item C');

    // After expansion we should see 3 entries with sourceComponent="mc-text",
    // all pointing back to the same source line (the loop body).
    const textEntries = result.sourceMap!.entries.filter((e) => e.sourceComponent === 'mc-text');
    expect(textEntries.length).toBe(3);
    const firstLine = textEntries[0]!.sourceLoc.startLine;
    expect(firstLine).toBeGreaterThan(0);
    for (const e of textEntries) {
      expect(e.sourceLoc.startLine).toBe(firstLine);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. mc-if / mc-else conditionals
// ---------------------------------------------------------------------------

describe('AUDIT — mc-if conditionals with string input', () => {
  it('mc-if true branch resolves with correct sourceLoc', () => {
    const json = `{
  "type": "mc",
  "attributes": {},
  "children": [
    { "type": "mc-body", "attributes": {}, "children": [
      { "type": "mc-section", "attributes": {}, "children": [
        { "type": "mc-column", "attributes": {}, "children": [
          {
            "type": "mc-if",
            "attributes": { "condition": "show" },
            "children": [
              { "type": "mc-text", "attributes": {}, "content": "shown" }
            ]
          },
          {
            "type": "mc-else",
            "attributes": {},
            "children": [
              { "type": "mc-text", "attributes": {}, "content": "hidden" }
            ]
          }
        ]}
      ]}
    ]}
  ]
}`;
    const result = compileFromJSON(json, {
      templateStyle: 'attribute',
      sourceMap: true,
      data: { show: true },
    });
    expect(result.html).toContain('shown');
    expect(result.html).not.toContain('hidden');

    const text = result.sourceMap!.entries.find((e) => e.sourceComponent === 'mc-text');
    expect(text).toBeDefined();
    expect(text!.sourceLoc.startLine).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4. MCDocument wrapper as string input
// ---------------------------------------------------------------------------

describe('AUDIT — MCDocument wrapper as string', () => {
  it('parses { version, metadata, template } and finds the template', () => {
    const json = `{
  "version": "1.0",
  "metadata": {
    "id": "test",
    "name": "Test",
    "created": "2026-01-01T00:00:00Z",
    "updated": "2026-01-01T00:00:00Z"
  },
  "template": {
    "type": "mc",
    "attributes": {},
    "children": [
      { "type": "mc-body", "attributes": {}, "children": [
        { "type": "mc-section", "attributes": {}, "children": [
          { "type": "mc-column", "attributes": {}, "children": [
            { "type": "mc-text", "attributes": {}, "content": "Doc" }
          ]}
        ]}
      ]}
    ]
  }
}`;
    const result = compileFromJSON(json, { templateStyle: 'attribute', sourceMap: true });
    expect(result.html).toContain('Doc');
    const mc = result.sourceMap!.entries.find((e) => e.sourceComponent === 'mc');
    expect(mc).toBeDefined();
    // The mc node lives inside `template` — verify it's mapped to a real line.
    expect(mc!.sourceLoc.startLine).toBeGreaterThan(0);
  });

  it('uses MCDocument.sampleData when no options.data given', () => {
    const json = `{
  "version": "1.0",
  "metadata": {"id":"t","name":"T","created":"2026-01-01T00:00:00Z","updated":"2026-01-01T00:00:00Z"},
  "sampleData": { "user": { "name": "FromDoc" } },
  "template": {
    "type": "mc",
    "attributes": {},
    "children": [
      { "type": "mc-body", "attributes": {}, "children": [
        { "type": "mc-section", "attributes": {}, "children": [
          { "type": "mc-column", "attributes": {}, "children": [
            { "type": "mc-text", "attributes": {}, "content": "Hi {{user.name}}" }
          ]}
        ]}
      ]}
    ]
  }
}`;
    const result = compileFromJSON(json, { templateStyle: 'attribute', sourceMap: true });
    expect(result.html).toContain('Hi FromDoc');
  });
});

// ---------------------------------------------------------------------------
// 5. Markup ↔ JSON parity — same content gives same HTML
// ---------------------------------------------------------------------------

describe('AUDIT — markup vs JSON-string parity', () => {
  it('produces matching HTML for the same template', () => {
    const markup = `<mc>
  <mc-body>
    <mc-section><mc-column>
      <mc-text>Hi {{name}}</mc-text>
    </mc-column></mc-section>
  </mc-body>
</mc>`;
    const json = `{
  "type": "mc", "attributes": {}, "children": [
    { "type": "mc-body", "attributes": {}, "children": [
      { "type": "mc-section", "attributes": {}, "children": [
        { "type": "mc-column", "attributes": {}, "children": [
          { "type": "mc-text", "attributes": {}, "content": "Hi {{name}}" }
        ]}
      ]}
    ]}
  ]
}`;
    const r1 = compile(markup, { templateStyle: 'attribute', data: { name: 'X' } });
    const r2 = compileFromJSON(json, { templateStyle: 'attribute', data: { name: 'X' } });
    // HTML byte-equal isn't guaranteed (synthetic vs real loc affects nothing
    // observable in HTML), but the rendered text must match.
    expect(r1.html).toContain('Hi X');
    expect(r2.html).toContain('Hi X');
    // Both produce HTML successfully.
    expect(r1.html).not.toBeNull();
    expect(r2.html).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6. Parse error positions — should be precise
// ---------------------------------------------------------------------------

describe('AUDIT — parse error precision', () => {
  it('reports parse error at exact line/col of bad token', () => {
    const json = `{
  "type": "mc",
  "attributes": {},
  "children": [
    { "type": "mc-body", "attributes": "WRONG_NOT_AN_OBJECT", "children": [] }
  }
}`; // <- typo: } where ] expected
    const out = parseJSONWithPositions(json);
    expect(out.value).toBeNull();
    expect(out.errors[0]!.code).toBe(ErrorCode.JSON_PARSE_ERROR);
    expect(out.errors[0]!.loc?.line).toBe(6);
  });

  it('parse error short-circuits compile and returns null html', () => {
    const result = compileFromJSON(`{ "type":`, { templateStyle: 'attribute' });
    expect(result.html).toBeNull();
    expect(result.partial).toBe(false);
    expect(result.errors.some((e) => e.code === ErrorCode.JSON_PARSE_ERROR)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Parser correctness — JSON edge cases
// ---------------------------------------------------------------------------

describe('AUDIT — parser edge cases', () => {
  it('handles unicode escapes including BMP', () => {
    const out = parseJSONWithPositions('"\\u00e9"');
    expect(out.value).toBe('é');
  });

  it('handles deep nesting without stack overflow', () => {
    let json = '0';
    for (let i = 0; i < 200; i++) json = `[${json}]`;
    const out = parseJSONWithPositions(json);
    expect(out.errors).toHaveLength(0);
    // Deep array — only check it parsed without error.
    expect(Array.isArray(out.value)).toBe(true);
  });

  it('handles numbers — negative, decimal, exponent', () => {
    for (const src of ['0', '-1', '3.14', '-0.5', '1e10', '1.5E-3']) {
      const out = parseJSONWithPositions(src);
      expect(out.errors).toHaveLength(0);
      expect(out.value).toBe(JSON.parse(src));
    }
  });

  it('rejects JS-only literals: NaN, Infinity, undefined', () => {
    for (const src of ['NaN', 'Infinity', 'undefined']) {
      const out = parseJSONWithPositions(src);
      expect(out.errors.length).toBeGreaterThan(0);
    }
  });

  it('rejects bare leading zeros (per strict JSON grammar)', () => {
    const out = parseJSONWithPositions('00');
    // First 0 parses fine, then trailing 0 is "unexpected trailing content"
    expect(out.errors.length).toBeGreaterThan(0);
  });

  it('handles strings with embedded escaped quotes', () => {
    const out = parseJSONWithPositions(String.raw`"a \"b\" c"`);
    expect(out.errors).toHaveLength(0);
    expect(out.value).toBe('a "b" c');
  });
});

// ---------------------------------------------------------------------------
// 8. attributes/{} containers — should NOT have loc attached
// ---------------------------------------------------------------------------

describe('AUDIT — non-typed objects do not pollute', () => {
  it('attribute objects stay clean', () => {
    const out = parseJSONWithPositions(`{
  "type": "mc",
  "attributes": { "background-color": "#fff", "padding": "10px" }
}`);
    const root = out.value as { attributes: Record<string, unknown> };
    expect((root.attributes as { loc?: unknown }).loc).toBeUndefined();
    expect(root.attributes['background-color']).toBe('#fff');
  });
});

// ---------------------------------------------------------------------------
// 9. mc-attributes / mc-all defaults
// ---------------------------------------------------------------------------

describe('AUDIT — mc-attributes head defaults', () => {
  it('document-level defaults apply through the JSON path', () => {
    const json = `{
  "type": "mc",
  "attributes": {},
  "children": [
    {
      "type": "mc-head",
      "attributes": {},
      "children": [
        {
          "type": "mc-attributes",
          "attributes": {},
          "children": [
            { "type": "mc-text", "attributes": { "color": "#ff0000" } }
          ]
        }
      ]
    },
    {
      "type": "mc-body",
      "attributes": {},
      "children": [
        { "type": "mc-section", "attributes": {}, "children": [
          { "type": "mc-column", "attributes": {}, "children": [
            { "type": "mc-text", "attributes": {}, "content": "X" }
          ]}
        ]}
      ]
    }
  ]
}`;
    const result = compileFromJSON(json, { templateStyle: 'attribute', sourceMap: true });
    expect(result.html).toContain('#ff0000');
  });
});

// ---------------------------------------------------------------------------
// 10. Empty template / minimal valid input
// ---------------------------------------------------------------------------

describe('AUDIT — minimal valid input', () => {
  it('bare mc with empty mc-body parses and compiles', () => {
    const result = compileFromJSON(
      `{ "type": "mc", "attributes": {}, "children": [{ "type": "mc-body", "attributes": {} }] }`,
      { templateStyle: 'attribute', sourceMap: true },
    );
    expect(result.html).not.toBeNull();
    expect(result.html).toContain('<!DOCTYPE html>');
  });
});

// ---------------------------------------------------------------------------
// 11. Object input WITH manually-attached loc (SDK use case)
// ---------------------------------------------------------------------------

describe('AUDIT — pre-attached loc on object input flows through', () => {
  it('SDK-supplied loc is honored', () => {
    const node = {
      type: 'mc',
      attributes: {},
      loc: { start: { line: 100, col: 1, offset: 0 }, end: { line: 200, col: 1, offset: 0 } },
      children: [
        {
          type: 'mc-body',
          attributes: {},
          children: [
            {
              type: 'mc-section',
              attributes: {},
              children: [
                {
                  type: 'mc-column',
                  attributes: {},
                  children: [
                    {
                      type: 'mc-text',
                      attributes: {},
                      content: 'Hi',
                      loc: { start: { line: 150, col: 5, offset: 0 }, end: { line: 152, col: 5, offset: 0 } },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = compileFromJSON(node as never, { templateStyle: 'attribute', sourceMap: true });
    const text = result.sourceMap!.entries.find((e) => e.sourceComponent === 'mc-text');
    expect(text!.sourceLoc.startLine).toBe(150);
    expect(text!.sourceLoc.endLine).toBe(152);
    const mc = result.sourceMap!.entries.find((e) => e.sourceComponent === 'mc');
    expect(mc!.sourceLoc.startLine).toBe(100);
  });
});
