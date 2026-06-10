/**
 * Tests for the example product-card plugin.
 *
 * After the plugin-as-values migration, the plugin is a value passed into
 * `compile()` per call — no global registration, no introspection of
 * per-call plugins. These tests verify end-to-end compilation, escaping,
 * and that the metadata on the returned Plugin value is what we expect.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/index.js';
import { productCardPlugin } from './product-card-plugin.js';

describe('acme-product-card plugin', () => {
  it('plugin value exposes the expected type and metadata shape', () => {
    expect(productCardPlugin.type).toBe('acme-product-card');
    const requiredAttrs = Object.entries(productCardPlugin.metadata.attributes)
      .filter(([, attr]) => attr.required)
      .map(([name]) => name)
      .sort();
    expect(requiredAttrs).toEqual(['cta-href', 'image-url', 'price', 'title']);
  });

  it('compiles a template using the plugin', () => {
    const result = compile(
      `
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
    `,
      { plugins: [productCardPlugin] },
    );

    expect(result.errors).toEqual([]);
    expect(result.html).toContain('Acme Widget');
    expect(result.html).toContain('$19.99');
    expect(result.html).toContain('https://example.com/widget');
    // Default cta-label
    expect(result.html).toContain('Shop now');
  });

  it('escapes user-controlled strings (XSS-safe)', () => {
    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-product-card ` +
        `image-url="https://cdn.example.com/widget.png" ` +
        `title="{{evil}}" ` +
        `price="$1" ` +
        `cta-href="https://example.com/x" />` +
        `</mc-column></mc-section></mc-body></mc>`,
      {
        plugins: [productCardPlugin],
        data: { evil: 'safe<script>alert(1)</script>end' },
      },
    );

    expect(result.errors).toEqual([]);
    expect(result.html ?? '').not.toContain('<script>alert(1)</script>');
    expect(result.html ?? '').toContain(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });
});
