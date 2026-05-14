/**
 * Tests for the example product-card plugin.
 *
 * Verifies: registration, end-to-end compilation, escaping, introspection.
 *
 * The plugin file exports `registerProductCard()` (the recommended npm
 * pattern) so tests can reset the registry between runs and re-register
 * cleanly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  compile,
  introspect,
  isComponentRegistered,
} from '../../src/index.js';
import { _resetRegistry } from '../../src/registry/component-registry.js';
import { _reseedBuiltins } from '../../src/registry/init.js';
import { registerProductCard } from './product-card-plugin.js';

beforeEach(() => {
  _resetRegistry();
  _reseedBuiltins();
  registerProductCard();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('acme-product-card plugin', () => {
  it('registers without error', () => {
    expect(isComponentRegistered('acme-product-card')).toBe(true);
  });

  it('compiles a template using the plugin', () => {
    const result = compile(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <acme-product-card
                image-url="https://cdn.example.com/widget.png"
                title="Acme Widget"
                price="$19.99"
                cta-href="https://example.com/widget"
              />
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);

    expect(result.errors).toEqual([]);
    expect(result.html).toContain('Acme Widget');
    expect(result.html).toContain('$19.99');
    expect(result.html).toContain('https://example.com/widget');
    // Default cta-label
    expect(result.html).toContain('Shop now');
  });

  it('escapes user-controlled strings (XSS-safe)', () => {
    // Pass the untrusted string via template variable interpolation — that's
    // how a real plugin user would receive untrusted data (e.g. from a CMS
    // or form submission). mailc's templating delivers the raw string to the
    // attribute, then the plugin's escape() neutralises it before output.
    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-product-card ` +
        `image-url="https://cdn.example.com/widget.png" ` +
        `title="{{evil}}" ` +
        `price="$1" ` +
        `cta-href="https://example.com/x" />` +
        `</mc-column></mc-section></mc-body></mc>`,
      { data: { evil: 'safe<script>alert(1)</script>end' } },
    );

    expect(result.errors).toEqual([]);
    // Should NOT contain the raw script tag — the escape() call neutralises it.
    expect(result.html ?? '').not.toContain('<script>alert(1)</script>');
    // Single-boundary escape: the template engine leaves the raw value in
    // the AST, the plugin's escape() neutralises `<script>` to
    // `&lt;script&gt;` once, and the compiler emits that string into the
    // HTML body verbatim (no second escape pass). The dangerous form
    // never reaches the inbox.
    expect(result.html ?? '').toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('introspects via introspect.component()', () => {
    const spec = introspect.component('acme-product-card');
    expect(spec).toBeDefined();
    expect(spec?.type).toBe('acme-product-card');
    expect(spec?.requiredAttributes.map((a) => a.name).sort()).toEqual([
      'cta-href',
      'image-url',
      'price',
      'title',
    ]);
    expect(spec?.cssPropertyAttributes.map((a) => a.name)).toEqual([
      'background-color',
    ]);
  });

  it('appears as a valid child of mc-column', () => {
    const columnSpec = introspect.component('mc-column');
    expect(columnSpec?.allowedChildren).toContain('acme-product-card');
  });
});
