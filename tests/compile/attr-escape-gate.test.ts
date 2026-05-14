/**
 * Gate test for single-boundary attribute escaping across all 3 entry points
 * (markup, `{{ var }}`, JSON). Each user-controllable attribute must emit
 * escaped (`&amp;` `&lt;` `&gt;` `&quot;` `&#39;`) — never raw chars that
 * could break the attribute or inject new ones.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { compileFromJSON } from '../../src/json/index.js';
import type { MCNode } from '../../src/json/schema.js';
import { escapeHtml } from '../../src/utils/html-escape.js';

const PAYLOAD = `He said "hi" & <b>'go'</b>`;

/** Markup payload: omits `'` so it can sit inside single-quoted attrs. */
const PAYLOAD_MARKUP = `He said "hi" & <b>go</b>`;

/**
 * Top-level attribute names of a tag, parsed structurally. Verifies an
 * injected `onload="alert(1)"` doesn't become a real attribute even when
 * its text appears inside an escaped value.
 */
function attrNamesOf(tag: string): Set<string> {
  const names = new Set<string>();
  const body = tag.replace(/^<[^\s>]+\s*/, '').replace(/\/?>\s*$/, '');
  const attrRe = /([a-zA-Z_:][\w:.-]*)\s*=\s*"[^"]*"/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(body)) !== null) {
    names.add((m[1] as string).toLowerCase());
  }
  return names;
}

/**
 * Asserts the tag contains the exact serialized attribute `name="escape(raw)"`.
 * Stricter than scanning for absence of dangerous chars — catches truncation
 * at the first leaked `"`, where the head looks clean but the rest leaked.
 */
function assertAttrEscaped(tag: string, name: string, rawValue: string, label: string): void {
  const expectedFragment = ` ${name}="${escapeHtml(rawValue)}"`;
  expect(tag, `${label} — expected fragment "${expectedFragment.slice(0, 80)}…"`).toContain(expectedFragment);
}

describe('attr-escape gate — markup path (static attributes)', () => {
  it('mc-image: alt, title, href escape correctly', () => {
    const src = `<mc>
      <mc-body>
        <mc-section>
          <mc-column>
            <mc-image
              src="https://example.com/a.png"
              alt='${PAYLOAD_MARKUP}'
              title='${PAYLOAD_MARKUP}'
              href='https://example.com/?q=${PAYLOAD_MARKUP}' />
          </mc-column>
        </mc-section>
      </mc-body>
    </mc>`;
    const r = compile(src);
    const html = r.html ?? '';
    const imgTag = /<img[^>]*\/?>/.exec(html)?.[0] ?? '';
    const aTag = /<a [^>]*>/.exec(html)?.[0] ?? '';
    assertAttrEscaped(imgTag, 'alt', PAYLOAD_MARKUP, 'mc-image alt');
    assertAttrEscaped(imgTag, 'title', PAYLOAD_MARKUP, 'mc-image title');
    assertAttrEscaped(aTag, 'href', `https://example.com/?q=${PAYLOAD_MARKUP}`, 'mc-image href');
  });

  it('mc-body: lang, dir escape on <html> and on wrapper', () => {
    const src = `<mc>
      <mc-body lang='en${PAYLOAD_MARKUP}' dir='ltr${PAYLOAD_MARKUP}'>
        <mc-section><mc-column><mc-text>x</mc-text></mc-column></mc-section>
      </mc-body>
    </mc>`;
    const r = compile(src);
    const html = r.html ?? '';
    const htmlTag = /<html[^>]*>/.exec(html)?.[0] ?? '';
    assertAttrEscaped(htmlTag, 'lang', `en${PAYLOAD_MARKUP}`, '<html> lang');
    assertAttrEscaped(htmlTag, 'dir', `ltr${PAYLOAD_MARKUP}`, '<html> dir');
    const wrapperTag = /<div role="article"[^>]*>/.exec(html)?.[0] ?? '';
    assertAttrEscaped(wrapperTag, 'lang', `en${PAYLOAD_MARKUP}`, 'wrapper lang');
    assertAttrEscaped(wrapperTag, 'dir', `ltr${PAYLOAD_MARKUP}`, 'wrapper dir');
  });

  it('mc-hero: aria-label escapes correctly', () => {
    const src = `<mc>
      <mc-body>
        <mc-hero aria-label='${PAYLOAD_MARKUP}'>
          <mc-text>x</mc-text>
        </mc-hero>
      </mc-body>
    </mc>`;
    const r = compile(src);
    const html = r.html ?? '';
    assertAttrEscaped(html, 'aria-label', PAYLOAD_MARKUP, 'mc-hero aria-label');
  });

  it('id attribute on any component escapes correctly', () => {
    const src = `<mc>
      <mc-body>
        <mc-section id='${PAYLOAD_MARKUP}'>
          <mc-column>
            <mc-text>x</mc-text>
          </mc-column>
        </mc-section>
      </mc-body>
    </mc>`;
    const r = compile(src);
    const html = r.html ?? '';
    assertAttrEscaped(html, 'id', PAYLOAD_MARKUP, 'mc-section id');
  });

  it('id escapes on mc-column, mc-group, mc-text, mc-spacer, mc-divider, mc-list, mc-button', () => {
    const src = `<mc>
      <mc-body>
        <mc-section>
          <mc-column id='col-${PAYLOAD_MARKUP}'>
            <mc-text id='text-${PAYLOAD_MARKUP}'>x</mc-text>
            <mc-spacer id='spacer-${PAYLOAD_MARKUP}' />
            <mc-divider id='div-${PAYLOAD_MARKUP}' />
            <mc-list id='list-${PAYLOAD_MARKUP}'>
              <mc-list-item id='li-${PAYLOAD_MARKUP}'>a</mc-list-item>
            </mc-list>
            <mc-button id='btn-${PAYLOAD_MARKUP}' href='https://example.com/'>go</mc-button>
          </mc-column>
        </mc-section>
        <mc-section>
          <mc-group id='grp-${PAYLOAD_MARKUP}'>
            <mc-column><mc-text>y</mc-text></mc-column>
          </mc-group>
        </mc-section>
      </mc-body>
    </mc>`;
    const r = compile(src);
    const html = r.html ?? '';
    assertAttrEscaped(html, 'id', `col-${PAYLOAD_MARKUP}`, 'mc-column id');
    assertAttrEscaped(html, 'id', `text-${PAYLOAD_MARKUP}`, 'mc-text id');
    assertAttrEscaped(html, 'id', `spacer-${PAYLOAD_MARKUP}`, 'mc-spacer id');
    assertAttrEscaped(html, 'id', `div-${PAYLOAD_MARKUP}`, 'mc-divider id');
    assertAttrEscaped(html, 'id', `list-${PAYLOAD_MARKUP}`, 'mc-list id');
    assertAttrEscaped(html, 'id', `li-${PAYLOAD_MARKUP}`, 'mc-list-item id');
    assertAttrEscaped(html, 'id', `btn-${PAYLOAD_MARKUP}`, 'mc-button id');
    assertAttrEscaped(html, 'id', `grp-${PAYLOAD_MARKUP}`, 'mc-group id');
  });

  it('mc-table cell attributes (colspan, scope, width, align) escape correctly', () => {
    const src = `<mc>
      <mc-body>
        <mc-section><mc-column>
          <mc-table>
            <tr>
              <th scope='${PAYLOAD_MARKUP}' align='${PAYLOAD_MARKUP}' width='100${PAYLOAD_MARKUP}'>H</th>
              <td colspan='2${PAYLOAD_MARKUP}'>V</td>
            </tr>
          </mc-table>
        </mc-column></mc-section>
      </mc-body>
    </mc>`;
    const r = compile(src);
    const html = r.html ?? '';
    assertAttrEscaped(html, 'scope', PAYLOAD_MARKUP, 'mc-table th scope');
    assertAttrEscaped(html, 'align', PAYLOAD_MARKUP, 'mc-table th align');
    assertAttrEscaped(html, 'width', `100${PAYLOAD_MARKUP}`, 'mc-table th width');
    assertAttrEscaped(html, 'colspan', `2${PAYLOAD_MARKUP}`, 'mc-table td colspan');
  });

  it('mc-button href escapes correctly', () => {
    const src = `<mc>
      <mc-body>
        <mc-section><mc-column>
          <mc-button href='https://example.com/?q=${PAYLOAD_MARKUP}'>go</mc-button>
        </mc-column></mc-section>
      </mc-body>
    </mc>`;
    const r = compile(src);
    const html = r.html ?? '';
    assertAttrEscaped(html, 'href', `https://example.com/?q=${PAYLOAD_MARKUP}`, 'mc-button href');
  });

  // Raw " inside a single-quoted attr — unsafe compilers would emit the "
  // raw and let `onclick`/`onload` break out as real attributes.
  it('mc-image href injecting onclick is rendered as inert escaped text', () => {
    const src = `<mc>
      <mc-body>
        <mc-section>
          <mc-column>
            <mc-image
              src="https://example.com/a.png"
              alt="x"
              href='https://example.com/?q=" onclick="alert(1)' />
          </mc-column>
        </mc-section>
      </mc-body>
    </mc>`;
    const r = compile(src);
    const aTag = /<a [^>]*>/.exec(r.html ?? '')?.[0] ?? '';
    expect(attrNamesOf(aTag), 'onclick on <a>').not.toContain('onclick');
  });

  it('mc-body lang injecting onload is rendered as inert escaped text', () => {
    const src = `<mc>
      <mc-body lang='en" onload="alert(1)'>
        <mc-section><mc-column><mc-text>x</mc-text></mc-column></mc-section>
      </mc-body>
    </mc>`;
    const r = compile(src);
    const html = r.html ?? '';
    const htmlTag = /<html[^>]*>/.exec(html)?.[0] ?? '';
    expect(attrNamesOf(htmlTag), 'onload on <html>').not.toContain('onload');
    const wrapperTag = /<div role="article"[^>]*>/.exec(html)?.[0] ?? '';
    expect(attrNamesOf(wrapperTag), 'onload on wrapper').not.toContain('onload');
  });
});

describe('attr-escape gate — template path ({{ var }} in attributes)', () => {
  it('templated alt with dangerous chars from data resolves single-escaped', () => {
    const src = `<mc>
      <mc-body>
        <mc-section><mc-column>
          <mc-image src="https://example.com/a.png" alt="{{ name }}" />
        </mc-column></mc-section>
      </mc-body>
    </mc>`;
    const r = compile(src, { data: { name: PAYLOAD } });
    const html = r.html ?? '';
    assertAttrEscaped(html, 'alt', PAYLOAD, 'templated alt');
    // `&amp;amp;` would mean double-escape (templating + compiler).
    expect(html).not.toContain('&amp;amp;');
    expect(html).not.toContain('&amp;quot;');
    expect(html).not.toContain('&amp;lt;');
  });

  it('templated href escapes correctly', () => {
    const src = `<mc>
      <mc-body>
        <mc-section><mc-column>
          <mc-image src="https://example.com/a.png" alt="x" href="{{ url }}" />
        </mc-column></mc-section>
      </mc-body>
    </mc>`;
    const r = compile(src, { data: { url: `https://example.com/?q=${PAYLOAD}` } });
    const html = r.html ?? '';
    assertAttrEscaped(html, 'href', `https://example.com/?q=${PAYLOAD}`, 'templated href');
    expect(html).not.toContain('&amp;amp;');
  });

  it('templated id escapes correctly', () => {
    const src = `<mc>
      <mc-body>
        <mc-section id="{{ section_id }}">
          <mc-column><mc-text>x</mc-text></mc-column>
        </mc-section>
      </mc-body>
    </mc>`;
    const r = compile(src, { data: { section_id: PAYLOAD } });
    const html = r.html ?? '';
    assertAttrEscaped(html, 'id', PAYLOAD, 'templated id');
    expect(html).not.toContain('&amp;amp;');
  });
});

describe('attr-escape gate — JSON path (compileFromJSON)', () => {
  function jsonImage(attrs: Record<string, string>): MCNode {
    return {
      type: 'mc',
      attributes: {},
      children: [{
        type: 'mc-body',
        attributes: {},
        children: [{
          type: 'mc-section',
          attributes: {},
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [{
              type: 'mc-image',
              attributes: { src: 'https://example.com/a.png', ...attrs },
              children: [],
            }],
          }],
        }],
      }],
    };
  }

  it('alt with dangerous chars from JSON escapes correctly', () => {
    const r = compileFromJSON(jsonImage({ alt: PAYLOAD }));
    const html = r.html ?? '';
    assertAttrEscaped(html, 'alt', PAYLOAD, 'JSON alt');
  });

  it('href with dangerous chars from JSON escapes correctly', () => {
    const r = compileFromJSON(jsonImage({ alt: 'x', href: `https://example.com/?q=${PAYLOAD}` }));
    const html = r.html ?? '';
    assertAttrEscaped(html, 'href', `https://example.com/?q=${PAYLOAD}`, 'JSON href');
  });

  it('lang on mc-body from JSON escapes correctly on both <html> and wrapper', () => {
    const node: MCNode = {
      type: 'mc',
      attributes: {},
      children: [{
        type: 'mc-body',
        attributes: { lang: `en${PAYLOAD}` },
        children: [{
          type: 'mc-section',
          attributes: {},
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [{ type: 'mc-text', attributes: {}, content: 'x' }],
          }],
        }],
      }],
    };
    const r = compileFromJSON(node);
    const html = r.html ?? '';
    const htmlTag = /<html[^>]*>/.exec(html)?.[0] ?? '';
    assertAttrEscaped(htmlTag, 'lang', `en${PAYLOAD}`, 'JSON <html> lang');
    const wrapperTag = /<div role="article"[^>]*>/.exec(html)?.[0] ?? '';
    assertAttrEscaped(wrapperTag, 'lang', `en${PAYLOAD}`, 'JSON wrapper lang');
  });
});
