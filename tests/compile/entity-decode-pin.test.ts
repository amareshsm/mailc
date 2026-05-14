/**
 * End-to-end pin for entity handling. Contract:
 *   - PARSE: entity references decode to raw UTF-8 in the AST.
 *   - EMIT:  attributes escape once at output (`& < > " '` → entities).
 *            Text content passes through raw (mc-text supports inline HTML
 *            via INLINE_HTML_TAGS — escaping would break `<strong>` etc.).
 *            Leaf text slots (mc-title, mc-preview) escape in post-processor.
 *   - EXEMPT: mc-style content is CSS, never decoded.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';

/** Captures the raw wire bytes between ` name="` and the next `"`. */
function attrInOutput(html: string, name: string): string | undefined {
  const re = new RegExp(`\\s${name}="([^"]*)"`);
  return re.exec(html)?.[1];
}

/**
 * Body of the first `<p>` element. Non-greedy capture so a literal `<` in
 * the body (legitimate after entity decode) doesn't abort.
 */
function pTextInOutput(html: string): string | undefined {
  return /<p[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1];
}

describe('entity decode — text content (mc-text) passes through after decode', () => {
  it('&amp; decodes to & — emitted raw (browser-lenient)', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-text>A &amp; B</mc-text>
    </mc-column></mc-section></mc-body></mc>`);
    expect(pTextInOutput(r.html ?? '')).toBe('A & B');
  });

  it('literal & emits as & on the wire (browser-lenient)', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-text>A & B</mc-text>
    </mc-column></mc-section></mc-body></mc>`);
    expect(pTextInOutput(r.html ?? '')).toBe('A & B');
  });

  it('&lt; decodes to < (inline HTML passthrough)', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-text>x &lt; y</mc-text>
    </mc-column></mc-section></mc-body></mc>`);
    expect(pTextInOutput(r.html ?? '')).toBe('x < y');
  });

  it('&copy; decodes to © and emits ©', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-text>&copy; 2026</mc-text>
    </mc-column></mc-section></mc-body></mc>`);
    expect(pTextInOutput(r.html ?? '')).toBe('© 2026');
  });

  it('mixed entities and raw chars all decode to their UTF-8 form', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-text>A &amp; B &copy; C &lt; D</mc-text>
    </mc-column></mc-section></mc-body></mc>`);
    expect(pTextInOutput(r.html ?? '')).toBe('A & B © C < D');
  });

  it('numeric entity &#39; decodes', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-text>it&#39;s fine</mc-text>
    </mc-column></mc-section></mc-body></mc>`);
    expect(pTextInOutput(r.html ?? '')).toBe("it's fine");
  });

  it('hex numeric entity &#x27; decodes', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-text>it&#x27;s fine</mc-text>
    </mc-column></mc-section></mc-body></mc>`);
    expect(pTextInOutput(r.html ?? '')).toBe("it's fine");
  });

  // <strong> is in INLINE_HTML_TAGS — must stay literal, not become &lt;strong&gt;.
  // This is why the text emitter does not escape on output.
  it('inline HTML inside mc-text passes through unmodified', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-text>Click <strong>here</strong> now</mc-text>
    </mc-column></mc-section></mc-body></mc>`);
    expect(r.html ?? '').toContain('<strong>here</strong>');
  });
});

describe('entity decode — attribute values', () => {
  it('&amp; in double-quoted attr emits as &amp; (NOT &amp;amp;)', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-image src="https://example.com/x.png" alt="A &amp; B" />
    </mc-column></mc-section></mc-body></mc>`);
    expect(attrInOutput(r.html ?? '', 'alt')).toBe('A &amp; B');
  });

  it('literal & in single-quoted attr emits as &amp;', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-image src="https://example.com/x.png" alt='A & B' />
    </mc-column></mc-section></mc-body></mc>`);
    expect(attrInOutput(r.html ?? '', 'alt')).toBe('A &amp; B');
  });

  it('&quot; in attribute decodes to " then re-escapes to &quot;', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-image src="https://example.com/x.png" alt="He said &quot;hi&quot;" />
    </mc-column></mc-section></mc-body></mc>`);
    expect(attrInOutput(r.html ?? '', 'alt')).toBe('He said &quot;hi&quot;');
  });

  it('&copy; in attribute decodes to © (no escape needed for non-ASCII)', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-image src="https://example.com/x.png" alt="A &copy; B" />
    </mc-column></mc-section></mc-body></mc>`);
    expect(attrInOutput(r.html ?? '', 'alt')).toBe('A © B');
  });

  it('URL query strings with &amp; round-trip cleanly', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-image src="https://example.com/x.png" alt="x" href="https://example.com/?a=1&amp;b=2" />
    </mc-column></mc-section></mc-body></mc>`);
    expect(attrInOutput(r.html ?? '', 'href')).toBe('https://example.com/?a=1&amp;b=2');
  });

  it('URL query strings with literal & round-trip cleanly', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-image src="https://example.com/x.png" alt="x" href='https://example.com/?a=1&b=2' />
    </mc-column></mc-section></mc-body></mc>`);
    expect(attrInOutput(r.html ?? '', 'href')).toBe('https://example.com/?a=1&amp;b=2');
  });

  it('numeric entity in attribute decodes', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-image src="https://example.com/x.png" alt="it&#39;s fine" />
    </mc-column></mc-section></mc-body></mc>`);
    expect(attrInOutput(r.html ?? '', 'alt')).toBe('it&#39;s fine');
  });
});

describe('entity decode — no double escape under any source form', () => {
  it('&amp; in attribute never produces &amp;amp;', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-image src="https://example.com/x.png" alt="A &amp; B" />
    </mc-column></mc-section></mc-body></mc>`);
    expect(r.html ?? '').not.toContain('&amp;amp;');
  });

  it('&quot; in attribute never produces &amp;quot;', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-image src="https://example.com/x.png" alt="A &quot; B" />
    </mc-column></mc-section></mc-body></mc>`);
    expect(r.html ?? '').not.toContain('&amp;quot;');
  });

  // Text emitter decodes then passes through: `<` lands raw on the wire.
  // Lenient browsers render fine; strict HTML would prefer `&lt;`.
  it('&lt; in text decodes once — no &amp;lt; and no &lt;', () => {
    const r = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-text>A &lt; B</mc-text>
    </mc-column></mc-section></mc-body></mc>`);
    expect(r.html ?? '').not.toContain('&amp;lt;');
    expect(r.html ?? '').not.toContain('&lt;');
  });
});

// mc-title compiles into <title> via the accessibility post-processor.
// <title> has no inline-HTML, so the strict-HTML escape applies here —
// tokenizer decodes → AST raw → post-processor escapes once → wire holds &amp;.
describe('mc-title — entity decode + post-processor escape (single boundary)', () => {
  it('&amp; produces &amp; on the wire (NOT &amp;amp;)', () => {
    const r = compile(`<mc>
      <mc-head><mc-title>A &amp; B</mc-title></mc-head>
      <mc-body><mc-section><mc-column><mc-text>x</mc-text></mc-column></mc-section></mc-body>
    </mc>`, {
      config: {
        accessibility: { enabled: true, warnMissingAlt: true, enforceAltText: false, checkContrast: false },
      },
    });
    expect(r.html ?? '').toContain('<title>A &amp; B</title>');
    expect(r.html ?? '').not.toContain('&amp;amp;');
  });

  it('literal & escapes to &amp;', () => {
    const r = compile(`<mc>
      <mc-head><mc-title>A & B</mc-title></mc-head>
      <mc-body><mc-section><mc-column><mc-text>x</mc-text></mc-column></mc-section></mc-body>
    </mc>`, {
      config: {
        accessibility: { enabled: true, warnMissingAlt: true, enforceAltText: false, checkContrast: false },
      },
    });
    expect(r.html ?? '').toContain('<title>A &amp; B</title>');
  });

  it('&lt; escapes to &lt;', () => {
    const r = compile(`<mc>
      <mc-head><mc-title>x &lt; y</mc-title></mc-head>
      <mc-body><mc-section><mc-column><mc-text>x</mc-text></mc-column></mc-section></mc-body>
    </mc>`, {
      config: {
        accessibility: { enabled: true, warnMissingAlt: true, enforceAltText: false, checkContrast: false },
      },
    });
    expect(r.html ?? '').toContain('<title>x &lt; y</title>');
  });

  it('&copy; emits ©', () => {
    const r = compile(`<mc>
      <mc-head><mc-title>&copy; 2026 Acme</mc-title></mc-head>
      <mc-body><mc-section><mc-column><mc-text>x</mc-text></mc-column></mc-section></mc-body>
    </mc>`, {
      config: {
        accessibility: { enabled: true, warnMissingAlt: true, enforceAltText: false, checkContrast: false },
      },
    });
    expect(r.html ?? '').toContain('<title>© 2026 Acme</title>');
  });
});

describe('entity decode — mc-style content is exempt (CSS is not HTML)', () => {
  it('CSS inside <mc-style> passes through verbatim — no entity decode', () => {
    const r = compile(`<mc>
      <mc-head>
        <mc-style>.x { content: "a & b"; }</mc-style>
      </mc-head>
      <mc-body><mc-section><mc-column><mc-text>x</mc-text></mc-column></mc-section></mc-body>
    </mc>`);
    expect(r.html ?? '').toContain('content: "a & b"');
  });
});
