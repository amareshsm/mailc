/**
 * Tests for the JSON-string overload of `compileFromJSON()`.
 *
 * Three concerns:
 *  1. Position-tracking parser correctness on the JSON grammar.
 *  2. End-to-end: string input → real `sourceLoc` on every source map entry.
 *  3. Backward compat: object input still gets synthetic loc; markup path
 *     untouched.
 */

import { describe, it, expect } from 'vitest';
import { compileFromJSON, compile } from '../../src/index.js';
import { parseJSONWithPositions } from '../../src/json/json-position-parser.js';
import { ErrorCode } from '../../src/errors/codes.js';

// ---------------------------------------------------------------------------
// Position parser — grammar correctness
// ---------------------------------------------------------------------------

describe('parseJSONWithPositions — grammar', () => {
  it('parses primitives identically to JSON.parse', () => {
    for (const src of ['null', 'true', 'false', '42', '-3.14', '1e5', '"hi"', '[]', '{}']) {
      const out = parseJSONWithPositions(src);
      expect(out.errors).toHaveLength(0);
      expect(out.value).toEqual(JSON.parse(src));
    }
  });

  it('parses nested objects and arrays', () => {
    const src = '{"a": 1, "b": [2, 3, {"c": "d"}], "e": null}';
    const out = parseJSONWithPositions(src);
    expect(out.errors).toHaveLength(0);
    expect(out.value).toEqual(JSON.parse(src));
  });

  it('handles all JSON string escapes', () => {
    const src = String.raw`"a\"b\\c\/d\n\tA"`;
    const out = parseJSONWithPositions(src);
    expect(out.errors).toHaveLength(0);
    expect(out.value).toBe('a"b\\c/d\n\tA');
  });

  it('handles whitespace correctly', () => {
    const src = '  \n\t {  \n  "k"  :  \t "v" \n }  ';
    const out = parseJSONWithPositions(src);
    expect(out.errors).toHaveLength(0);
    expect(out.value).toEqual({ k: 'v' });
  });

  it('reports parse error with line/col on malformed input', () => {
    const src = '{\n  "a": 1,\n  "b" 2\n}';
    const out = parseJSONWithPositions(src);
    expect(out.value).toBeNull();
    expect(out.errors.length).toBeGreaterThan(0);
    const e = out.errors[0]!;
    expect(e.code).toBe(ErrorCode.JSON_PARSE_ERROR);
    expect(e.severity).toBe('error');
    expect(e.loc?.line).toBe(3); // line where `2` is
  });

  it('reports trailing comma as an error (strict JSON)', () => {
    const out = parseJSONWithPositions('{"a": 1,}');
    expect(out.value).toBeNull();
    expect(out.errors[0]!.code).toBe(ErrorCode.JSON_PARSE_ERROR);
  });

  it('reports unterminated string with position', () => {
    const out = parseJSONWithPositions('"hello');
    expect(out.value).toBeNull();
    expect(out.errors[0]!.message).toMatch(/unterminated/i);
  });

  it('attaches loc to every object that has a "type" property', () => {
    const src = `{
  "type": "mc",
  "attributes": {},
  "children": [
    { "type": "mc-body", "attributes": {} }
  ]
}`;
    const out = parseJSONWithPositions(src);
    const root = out.value as { loc: unknown; children: unknown[] };
    expect(root.loc).toBeDefined();
    const child = root.children[0] as { loc: { start: { line: number } } };
    expect(child.loc.start.line).toBe(5); // line where { "type": "mc-body" starts
  });

  it('does NOT attach loc to objects without a "type" property', () => {
    const src = '{ "attributes": { "color": "red" } }';
    const out = parseJSONWithPositions(src);
    const root = out.value as { attributes: { loc?: unknown } };
    // Plain attribute objects don't get loc — saves bytes and keeps tree clean.
    expect(root.attributes.loc).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// End-to-end — string input produces real sourceLoc on entries
// ---------------------------------------------------------------------------

const TINY_TREE = `{
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
                  "content": "Hello"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`;

describe('compileFromJSON — string input source map', () => {
  it('produces real sourceLoc for every entry (non-zero line)', () => {
    const result = compileFromJSON(TINY_TREE, { templateStyle: 'attribute', sourceMap: true });
    expect(result.html).not.toBeNull();
    expect(result.sourceMap).toBeDefined();
    const entries = result.sourceMap!.entries;
    expect(entries.length).toBeGreaterThan(0);
    // No entry should have synthetic {0,0,0,0} loc.
    for (const e of entries) {
      expect(e.sourceLoc.startLine).toBeGreaterThan(0);
      expect(e.sourceLoc.endLine).toBeGreaterThanOrEqual(e.sourceLoc.startLine);
    }
  });

  it('mc-text entry sourceLoc points to the line where { "type": "mc-text" starts', () => {
    const result = compileFromJSON(TINY_TREE, { templateStyle: 'attribute', sourceMap: true });
    const textEntry = result.sourceMap!.entries.find((e) => e.sourceComponent === 'mc-text');
    expect(textEntry).toBeDefined();
    // mc-text starts on line 17 of TINY_TREE (counting from 1).
    expect(textEntry!.sourceLoc.startLine).toBe(17);
  });

  it('outer mc entry spans the full document', () => {
    const result = compileFromJSON(TINY_TREE, { templateStyle: 'attribute', sourceMap: true });
    const mcEntry = result.sourceMap!.entries.find((e) => e.sourceComponent === 'mc');
    expect(mcEntry).toBeDefined();
    expect(mcEntry!.sourceLoc.startLine).toBe(1);
    expect(mcEntry!.sourceLoc.endLine).toBe(29); // closing } of outer object
  });

  it('parse error short-circuits compilation and surfaces JSON_PARSE_ERROR', () => {
    const malformed = `{ "type": "mc", "children": [ { broken `;
    const result = compileFromJSON(malformed, { templateStyle: 'attribute' });
    expect(result.html).toBeNull();
    const parseErrs = result.errors.filter((e) => e.code === ErrorCode.JSON_PARSE_ERROR);
    expect(parseErrs.length).toBeGreaterThan(0);
    expect(parseErrs[0]!.loc?.line).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility — object input is unchanged
// ---------------------------------------------------------------------------

describe('compileFromJSON — object input backward compat', () => {
  it('object input still gets synthetic sourceLoc (current behavior)', () => {
    const node = {
      type: 'mc',
      attributes: {},
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
                  children: [{ type: 'mc-text', attributes: {}, content: 'Hi' }],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = compileFromJSON(node, { templateStyle: 'attribute', sourceMap: true });
    const entries = result.sourceMap!.entries;
    expect(entries.length).toBeGreaterThan(0);
    // Without a JSON string, every entry should have synthetic loc {0,0,0,0}.
    for (const e of entries) {
      expect(e.sourceLoc.startLine).toBe(0);
      expect(e.sourceLoc.endLine).toBe(0);
    }
  });

  it('object input with a builder-supplied loc threads through to sourceLoc', () => {
    // Demonstrates that an SDK pre-attaching `loc` on MCNodes also works —
    // not just the string-input fast-path.
    const node = {
      type: 'mc',
      attributes: {},
      loc: { start: { line: 10, col: 1, offset: 0 }, end: { line: 50, col: 1, offset: 0 } },
      children: [
        {
          type: 'mc-body',
          attributes: {},
          children: [],
        },
      ],
    };
    const result = compileFromJSON(node, { templateStyle: 'attribute', sourceMap: true });
    const mcEntry = result.sourceMap!.entries.find((e) => e.sourceComponent === 'mc');
    expect(mcEntry!.sourceLoc.startLine).toBe(10);
    expect(mcEntry!.sourceLoc.endLine).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Markup path is unchanged
// ---------------------------------------------------------------------------

describe('compile() markup path — unchanged by JSON string overload', () => {
  it('markup path still produces real source positions', () => {
    const result = compile(
      `<mc>
  <mc-body>
    <mc-section><mc-column><mc-text>Hi</mc-text></mc-column></mc-section>
  </mc-body>
</mc>`,
      { sourceMap: true, templateStyle: 'attribute' },
    );
    expect(result.html).not.toBeNull();
    const entries = result.sourceMap!.entries;
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.sourceLoc.startLine).toBeGreaterThan(0);
    }
  });
});
