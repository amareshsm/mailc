/**
 * Tests for mc-group compiler.
 *
 * mc-group's job is to keep mc-column children side-by-side on mobile.
 * The mechanism is two-pronged:
 *   1. Wrapper <div> with display:inline-block + max-width:groupPx so the
 *      group occupies its own slot inside the section.
 *   2. Children compile with `insideGroup:true`, which makes mc-column omit
 *      the `mc-responsive` class — that class is the global @media query's
 *      target for flipping columns to width:100% on phones.
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/index.js';
import { compileGroup } from '../../src/compiler/components/group.js';
import { makeNode, makeContext } from './helpers.js';

describe('compileGroup', () => {
  it('wraps in inline-block div with mc-group class', () => {
    const node = makeNode('mc-group', {}, [
      makeNode('mc-column', { width: '50%' }),
      makeNode('mc-column', { width: '50%' }),
    ]);
    const ctx = makeContext({ parentWidth: 600, columnCount: 1 });
    const html = compileGroup(node, ctx);
    expect(html).toContain('class="mc-group"');
    expect(html).toContain('display:inline-block');
    expect(html).toContain('font-size:0');
    expect(html).toContain('max-width:600px');
  });

  it('emits outer Outlook td for the section row', () => {
    const node = makeNode('mc-group', {}, [makeNode('mc-column', { width: '100%' })]);
    const ctx = makeContext({ parentWidth: 600, columnCount: 1 });
    const html = compileGroup(node, ctx);
    expect(html).toMatch(/<!--\[if mso \| IE\]>\s*<td style="vertical-align:top;width:600px;">/);
  });

  it('emits inner Outlook table+tr for grouped columns', () => {
    const node = makeNode('mc-group', {}, [
      makeNode('mc-column', { width: '50%' }),
      makeNode('mc-column', { width: '50%' }),
    ]);
    const ctx = makeContext({ parentWidth: 600, columnCount: 1 });
    const html = compileGroup(node, ctx);
    expect(html).toMatch(/<!--\[if mso \| IE\]>\s*<table[^>]*>\s*<tr>\s*<!\[endif\]-->/);
  });

  it('halves the parent width when there are two siblings (no explicit width)', () => {
    const node = makeNode('mc-group', {}, [makeNode('mc-column', { width: '100%' })]);
    const ctx = makeContext({ parentWidth: 600, columnCount: 2 });
    const html = compileGroup(node, ctx);
    expect(html).toContain('width:300px');
    expect(html).toContain('max-width:300px');
  });

  it('honours an explicit percentage width', () => {
    const node = makeNode('mc-group', { width: '40%' }, [makeNode('mc-column', { width: '100%' })]);
    const ctx = makeContext({ parentWidth: 600, columnCount: 1 });
    const html = compileGroup(node, ctx);
    expect(html).toContain('width:240px');
    expect(html).toContain('max-width:240px');
  });

  it('honours an explicit pixel width', () => {
    const node = makeNode('mc-group', { width: '320px' }, [makeNode('mc-column', { width: '100%' })]);
    const ctx = makeContext({ parentWidth: 600, columnCount: 1 });
    const html = compileGroup(node, ctx);
    expect(html).toContain('width:320px');
    expect(html).toContain('max-width:320px');
  });

  it('reverses children when direction="rtl"', () => {
    const node = makeNode('mc-group', { direction: 'rtl' }, [
      makeNode('mc-column', { id: 'first', width: '50%' }),
      makeNode('mc-column', { id: 'second', width: '50%' }),
    ]);
    const ctx = makeContext({ parentWidth: 600, columnCount: 1 });
    const html = compileGroup(node, ctx);
    expect(html.indexOf('id="second"')).toBeLessThan(html.indexOf('id="first"'));
    expect(html).toContain('direction:rtl');
  });

  it('applies background-color to the wrapper div and Outlook td', () => {
    const node = makeNode('mc-group', { 'background-color': '#ff00ff' }, [
      makeNode('mc-column', { width: '100%' }),
    ]);
    const ctx = makeContext({ parentWidth: 600, columnCount: 1 });
    const html = compileGroup(node, ctx);
    expect(html).toMatch(/class="mc-group"[^>]*background-color:#ff00ff/);
    expect(html).toMatch(/<!--\[if mso \| IE\]>\s*<td[^>]*background-color:#ff00ff/);
  });

  it('warns when a child column has a px width', () => {
    const node = makeNode('mc-group', {}, [
      makeNode('mc-column', { width: '150px' }),
      makeNode('mc-column', { width: '50%' }),
    ]);
    const ctx = makeContext({ parentWidth: 600, columnCount: 1 });
    compileGroup(node, ctx);
    const codes = ctx.warnings.map((w) => w.code);
    expect(codes).toContain('GROUP_COLUMN_PX_WIDTH');
    expect(codes.filter((c) => c === 'GROUP_COLUMN_PX_WIDTH')).toHaveLength(1);
  });

  it('honours a user class alongside mc-group', () => {
    const node = makeNode('mc-group', { class: 'my-custom-class' }, [
      makeNode('mc-column', { width: '100%' }),
    ]);
    const ctx = makeContext({ parentWidth: 600, columnCount: 1, templateStyle: 'class' });
    const html = compileGroup(node, ctx);
    expect(html).toMatch(/class="mc-group my-custom-class"/);
  });

  it('passes id through to the wrapper div', () => {
    const node = makeNode('mc-group', { id: 'social-row' }, [
      makeNode('mc-column', { width: '100%' }),
    ]);
    const ctx = makeContext({ parentWidth: 600, columnCount: 1 });
    const html = compileGroup(node, ctx);
    expect(html).toContain('id="social-row"');
  });
});

// ---------------------------------------------------------------------------
// End-to-end behavioural tests via the public compile() API.
// ---------------------------------------------------------------------------

describe('mc-group end-to-end', () => {
  it('grouped columns omit mc-responsive; ungrouped sibling keeps it', () => {
    const html = compile(
      `<mc>
        <mc-body>
          <mc-section>
            <mc-column width="50%"><mc-text>plain</mc-text></mc-column>
            <mc-group width="50%">
              <mc-column width="50%"><mc-text>g1</mc-text></mc-column>
              <mc-column width="50%"><mc-text>g2</mc-text></mc-column>
            </mc-group>
          </mc-section>
        </mc-body>
      </mc>`,
    ).html ?? '';
    // Exactly one mc-responsive — the plain ungrouped column.
    const matches = html.match(/class="mc-responsive"/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('rejects mc-group placed outside mc-section (validator)', () => {
    const result = compile(
      `<mc><mc-body>
        <mc-group><mc-column><mc-text>x</mc-text></mc-column></mc-group>
      </mc-body></mc>`,
    );
    expect(result.errors.map((e) => e.code)).toContain('INVALID_NESTING');
  });

  it('rejects non-mc-column content directly inside mc-group (validator)', () => {
    const result = compile(
      `<mc><mc-body><mc-section>
        <mc-group><mc-text>nope</mc-text></mc-group>
      </mc-section></mc-body></mc>`,
    );
    // mc-text's parent must be mc-column / mc-hero — placing it under mc-group is invalid.
    expect(result.errors.map((e) => e.code)).toContain('INVALID_NESTING');
  });
});
