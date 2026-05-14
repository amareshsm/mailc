/**
 * Tests for CLASS_ATTR_IN_ATTRIBUTE_MODE.
 *
 * In `templateStyle: 'attribute'` (the default), the `class` attribute is
 * rejected on every component. Symmetric to the CSS_ATTR_IN_CLASS_MODE rule
 * for class mode. Hard error — routed to `result.errors`, sets partial:true.
 *
 * `<mc-attributes>` defaults are intentionally NOT exempt (Option B): allowing
 * class via defaults would create a silent classifier bypass through
 * `<mc-style>` rules. See discussion in the design decision; the rule is
 * "no class= anywhere in attribute mode."
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { compileFromJSON, markupToJSON } from '../../src/json/index.js';
import { ErrorCode } from '../../src/errors/codes.js';

const MINIMAL = (inner: string): string =>
  `<mc><mc-body><mc-section><mc-column>${inner}</mc-column></mc-section></mc-body></mc>`;

const classViolations = (r: ReturnType<typeof compile>): ReturnType<typeof compile>['errors'] =>
  r.errors.filter((e) => e.code === ErrorCode.CLASS_ATTR_IN_ATTRIBUTE_MODE);

describe('CLASS_ATTR_IN_ATTRIBUTE_MODE — markup pipeline', () => {
  it('class= on mc-text in attribute mode produces a hard error', () => {
    const r = compile(MINIMAL('<mc-text class="text-red-500">Hi</mc-text>'));
    const v = classViolations(r);
    expect(v).toHaveLength(1);
    expect(v[0]?.severity).toBe('error');
    expect(v[0]?.message).toContain('mc-text');
    expect(v[0]?.message).toContain('class');
    expect(v[0]?.message).toContain('attribute mode');
    expect(r.partial).toBe(true);
  });

  it('attribute mode is the default — no explicit templateStyle needed', () => {
    const explicit = compile(MINIMAL('<mc-text class="x">Hi</mc-text>'), {
      templateStyle: 'attribute',
    });
    const implicit = compile(MINIMAL('<mc-text class="x">Hi</mc-text>'));
    expect(classViolations(explicit).length).toBe(classViolations(implicit).length);
    expect(classViolations(implicit)).toHaveLength(1);
  });

  it('class= in class mode is allowed (no violation)', () => {
    const r = compile(MINIMAL('<mc-text class="text-red-500">Hi</mc-text>'), {
      templateStyle: 'class',
    });
    expect(classViolations(r)).toHaveLength(0);
  });

  it('no class= in attribute mode → no violation', () => {
    const r = compile(MINIMAL('<mc-text color="#333">Hi</mc-text>'));
    expect(classViolations(r)).toHaveLength(0);
  });

  it('fires on every component type that accepts class', () => {
    // Sample one per component family that has assertAttributeModeClass wired
    const r = compile(`<mc>
      <mc-body class="bg-gray">
        <mc-section class="my-4">
          <mc-column class="p-2">
            <mc-text class="text-red">Hi</mc-text>
            <mc-button class="rounded-lg" href="https://example.com">X</mc-button>
            <mc-image class="rounded" src="https://example.com/a.png" alt="a"/>
            <mc-divider class="my-2"/>
            <mc-spacer class="h-4"/>
          </mc-column>
        </mc-section>
      </mc-body>
    </mc>`);
    const v = classViolations(r);
    // 8 elements with class= → expect 8 violations
    expect(v.length).toBeGreaterThanOrEqual(8);
  });

  it('routes to result.errors (not result.warnings)', () => {
    const r = compile(MINIMAL('<mc-text class="x">Hi</mc-text>'));
    expect(r.errors.some((e) => e.code === ErrorCode.CLASS_ATTR_IN_ATTRIBUTE_MODE)).toBe(true);
    expect(r.warnings.some((w) => w.code === ErrorCode.CLASS_ATTR_IN_ATTRIBUTE_MODE)).toBe(false);
  });

  it('mc-attributes default class= is NOT exempt (Option B)', () => {
    const source = `<mc>
      <mc-head>
        <mc-attributes>
          <mc-text class="base-text"/>
        </mc-attributes>
      </mc-head>
      <mc-body><mc-section><mc-column>
        <mc-text>Plain</mc-text>
      </mc-column></mc-section></mc-body>
    </mc>`;
    const r = compile(source);
    // The default class= itself, written inside mc-attributes, is the violation source.
    // Whether the violation surfaces at the default declaration or at every consuming
    // mc-text node is an implementation detail — we just verify at least one fires.
    const v = classViolations(r);
    expect(v.length).toBeGreaterThanOrEqual(1);
  });

  it('fix instruction suggests removing class or switching to class mode', () => {
    const r = compile(MINIMAL('<mc-text class="x">Hi</mc-text>'));
    const v = classViolations(r);
    expect(v[0]?.fix).toBeDefined();
    expect(v[0]?.fix?.toLowerCase()).toContain('class');
  });
});

describe('CLASS_ATTR_IN_ATTRIBUTE_MODE — JSON pipeline parity', () => {
  it('fires symmetrically when compiled via compileFromJSON', () => {
    const json = markupToJSON(MINIMAL('<mc-text class="x">Hi</mc-text>'));
    const r = compileFromJSON(json);
    const v = r.errors.filter((e) => e.code === ErrorCode.CLASS_ATTR_IN_ATTRIBUTE_MODE);
    expect(v).toHaveLength(1);
    expect(v[0]?.severity).toBe('error');
    expect(r.partial).toBe(true);
  });

  it('markup and JSON paths agree on violation count', () => {
    const source = MINIMAL('<mc-text class="a">Hi</mc-text>');
    const markupResult = compile(source);
    const jsonResult = compileFromJSON(markupToJSON(source));
    const markupCount = markupResult.errors.filter((e) => e.code === ErrorCode.CLASS_ATTR_IN_ATTRIBUTE_MODE).length;
    const jsonCount = jsonResult.errors.filter((e) => e.code === ErrorCode.CLASS_ATTR_IN_ATTRIBUTE_MODE).length;
    expect(markupCount).toBe(jsonCount);
    expect(markupCount).toBeGreaterThan(0);
  });

  it('class mode in JSON pipeline does not produce CLASS_ATTR_IN_ATTRIBUTE_MODE', () => {
    const json = markupToJSON(MINIMAL('<mc-text class="x">Hi</mc-text>'));
    const r = compileFromJSON(json, { templateStyle: 'class' });
    expect(r.errors.some((e) => e.code === ErrorCode.CLASS_ATTR_IN_ATTRIBUTE_MODE)).toBe(false);
  });
});
