/**
 * Tests for the STRICT_MODE_MCSTYLE_BYPASS info signal.
 *
 * Behavioral contract:
 *
 *   - Fires ONCE per compile (not once per mc-style block)
 *   - Only when `compatibilityMode === 'strict'`
 *   - Only when at least one `<mc-style>` block is present in the source
 *   - Severity is `info` — does NOT fail `--fail-on-warnings` CI gates
 *   - Counts blocks accurately and reports "1 block" vs "N blocks" correctly
 *   - Symmetric across `compile()` (markup) and `compileFromJSON()` (JSON)
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { compileFromJSON, markupToJSON } from '../../src/json/index.js';
import { ErrorCode } from '../../src/errors/codes.js';

const SOURCE_WITH_STYLE = `<mc>
  <mc-head>
    <mc-title>X</mc-title>
    <mc-style>.btn { box-shadow: 0 4px 8px red; }</mc-style>
  </mc-head>
  <mc-body><mc-section><mc-column><mc-text>hi</mc-text></mc-column></mc-section></mc-body>
</mc>`;

const SOURCE_WITH_TWO_STYLES = `<mc>
  <mc-head>
    <mc-title>X</mc-title>
    <mc-style>.btn { box-shadow: 0 4px 8px red; }</mc-style>
    <mc-style>.x { opacity: 0.8; }</mc-style>
  </mc-head>
  <mc-body><mc-section><mc-column><mc-text>hi</mc-text></mc-column></mc-section></mc-body>
</mc>`;

const SOURCE_NO_STYLE = `<mc>
  <mc-head><mc-title>X</mc-title></mc-head>
  <mc-body><mc-section><mc-column><mc-text>hi</mc-text></mc-column></mc-section></mc-body>
</mc>`;

const findBypassInfo = (
  r: ReturnType<typeof compile>,
): ReturnType<typeof compile>['info'][number] | undefined =>
  r.info.find((i) => i.code === ErrorCode.STRICT_MODE_MCSTYLE_BYPASS);

describe('STRICT_MODE_MCSTYLE_BYPASS info signal (markup pipeline)', () => {
  it('fires when strict + mc-style present', () => {
    const r = compile(SOURCE_WITH_STYLE, { compatibilityMode: 'strict' });
    const i = findBypassInfo(r);
    expect(i).toBeDefined();
    expect(i?.severity).toBe('info');
    expect(i?.message).toContain('strict');
    expect(i?.message).toContain('1 <mc-style>');
    expect(i?.message).toContain('block was');
  });

  it('does NOT fire in liberal mode even with mc-style present', () => {
    const r = compile(SOURCE_WITH_STYLE, { compatibilityMode: 'liberal' });
    expect(findBypassInfo(r)).toBeUndefined();
  });

  it('does NOT fire by default (liberal is the default compatibilityMode)', () => {
    const r = compile(SOURCE_WITH_STYLE);
    expect(findBypassInfo(r)).toBeUndefined();
  });

  it('does NOT fire in strict mode without any mc-style block', () => {
    const r = compile(SOURCE_NO_STYLE, { compatibilityMode: 'strict' });
    expect(findBypassInfo(r)).toBeUndefined();
  });

  it('fires ONCE even with two mc-style blocks, and reports the correct count', () => {
    const r = compile(SOURCE_WITH_TWO_STYLES, { compatibilityMode: 'strict' });
    const all = r.info.filter((i) => i.code === ErrorCode.STRICT_MODE_MCSTYLE_BYPASS);
    expect(all).toHaveLength(1);
    expect(all[0]?.message).toContain('2 <mc-style>');
    expect(all[0]?.message).toContain('blocks were');
  });

  it('lands in result.info (NOT result.warnings) so --fail-on-warnings ignores it', () => {
    const r = compile(SOURCE_WITH_STYLE, { compatibilityMode: 'strict' });
    expect(r.info.some((i) => i.code === ErrorCode.STRICT_MODE_MCSTYLE_BYPASS)).toBe(true);
    expect(r.warnings.some((w) => w.code === ErrorCode.STRICT_MODE_MCSTYLE_BYPASS)).toBe(false);
    expect(r.errors.some((e) => e.code === ErrorCode.STRICT_MODE_MCSTYLE_BYPASS)).toBe(false);
  });
});

describe('STRICT_MODE_MCSTYLE_BYPASS info signal (JSON pipeline parity)', () => {
  const JSON_WITH_STYLE = markupToJSON(SOURCE_WITH_STYLE);
  const JSON_NO_STYLE = markupToJSON(SOURCE_NO_STYLE);
  const JSON_WITH_TWO = markupToJSON(SOURCE_WITH_TWO_STYLES);

  it('fires when strict + mc-style present', () => {
    const r = compileFromJSON(JSON_WITH_STYLE, { compatibilityMode: 'strict' });
    const i = r.info.find((x) => x.code === ErrorCode.STRICT_MODE_MCSTYLE_BYPASS);
    expect(i).toBeDefined();
    expect(i?.severity).toBe('info');
    expect(i?.message).toContain('1 <mc-style>');
  });

  it('does NOT fire in liberal', () => {
    const r = compileFromJSON(JSON_WITH_STYLE, { compatibilityMode: 'liberal' });
    expect(r.info.find((x) => x.code === ErrorCode.STRICT_MODE_MCSTYLE_BYPASS)).toBeUndefined();
  });

  it('does NOT fire without mc-style', () => {
    const r = compileFromJSON(JSON_NO_STYLE, { compatibilityMode: 'strict' });
    expect(r.info.find((x) => x.code === ErrorCode.STRICT_MODE_MCSTYLE_BYPASS)).toBeUndefined();
  });

  it('counts multiple blocks correctly + fires once', () => {
    const r = compileFromJSON(JSON_WITH_TWO, { compatibilityMode: 'strict' });
    const all = r.info.filter((x) => x.code === ErrorCode.STRICT_MODE_MCSTYLE_BYPASS);
    expect(all).toHaveLength(1);
    expect(all[0]?.message).toContain('2 <mc-style>');
  });

  it('markup and JSON paths agree on whether the signal fires', () => {
    const markupResult = compile(SOURCE_WITH_STYLE, { compatibilityMode: 'strict' });
    const jsonResult = compileFromJSON(JSON_WITH_STYLE, { compatibilityMode: 'strict' });
    const markupFired = markupResult.info.some((i) => i.code === ErrorCode.STRICT_MODE_MCSTYLE_BYPASS);
    const jsonFired = jsonResult.info.some((i) => i.code === ErrorCode.STRICT_MODE_MCSTYLE_BYPASS);
    expect(markupFired).toBe(true);
    expect(jsonFired).toBe(true);
    expect(markupFired).toBe(jsonFired);
  });
});
