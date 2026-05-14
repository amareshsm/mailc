/**
 * `<acme-product-card>` plugin — a worked example of mailc's `defineComponent()` API.
 *
 * Exports `registerProductCard()` rather than self-registering on import. This
 * matches the recommended npm-package pattern (see the FAQ in
 * `docs/14-custom-components-plugins.md`) and makes the plugin testable in
 * isolation: tests can reset the registry between runs and re-call the
 * register function.
 */

import {
  defineComponent,
  type ComponentMetadata,
  type ComponentCompiler,
} from '../../src/index.js';

// ---------------------------------------------------------------------------
// HTML escape — always escape user-controlled strings before interpolating
// ---------------------------------------------------------------------------

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Compiler — turns an AST node into HTML
// ---------------------------------------------------------------------------

const compileProductCard: ComponentCompiler = (node) => {
  const a = node.attributes;
  const imageUrl = escape(a['image-url'] ?? '');
  const title = escape(a['title'] ?? '');
  const price = escape(a['price'] ?? '');
  const ctaHref = escape(a['cta-href'] ?? '');
  const ctaLabel = escape(a['cta-label'] ?? 'Shop now');
  const bg = escape(a['background-color'] ?? '#ffffff');

  return (
    `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" ` +
    `style="background:${bg};border-radius:8px;border:1px solid #e5e7eb;">` +
    `<tr><td style="padding:16px;text-align:center;">` +
    `<img src="${imageUrl}" alt="${title}" width="200" ` +
    `style="display:block;margin:0 auto;border-radius:4px;" />` +
    `<h3 style="font-family:sans-serif;font-size:18px;margin:12px 0 4px;color:#111827;">${title}</h3>` +
    `<p style="font-family:sans-serif;font-size:16px;margin:0 0 12px;color:#374151;">${price}</p>` +
    `<a href="${ctaHref}" ` +
    `style="display:inline-block;padding:10px 20px;background:#f97316;color:#ffffff;` +
    `text-decoration:none;border-radius:4px;font-family:sans-serif;font-size:14px;">${ctaLabel}</a>` +
    `</td></tr></table>`
  );
};

// ---------------------------------------------------------------------------
// Metadata — what the validator, introspector, and IDE/AI tools see
// ---------------------------------------------------------------------------

const productCardMetadata: ComponentMetadata = {
  description: 'A product card with image, title, price, and call-to-action button.',
  category: 'content',
  parent: 'mc-column',
  alternateParents: ['mc-section'],
  maxChildren: 0,
  allowsTextContent: false,
  compilerOutputElements: ['table', 'tr', 'td', 'img', 'h3', 'p', 'a'],
  compilerOutputReason: 'Outer table for layout safety; inner content uses semantic tags.',
  validClassCategories: ['background', 'spacing'],
  commonMistakes: [
    'Forgetting the cta-href attribute',
    'Using non-https image URLs (some clients block them)',
  ],
  attributes: {
    'image-url': {
      type: 'url',
      required: true,
      description: 'Product image URL. Should be HTTPS.',
      example: 'https://cdn.example.com/product.png',
      hasEmailCompatibilityNotes: false,
    },
    'title': {
      type: 'string',
      required: true,
      description: 'Product title shown above the price.',
      example: 'Acme Widget',
      hasEmailCompatibilityNotes: false,
    },
    'price': {
      type: 'string',
      required: true,
      description: 'Display price (formatted as a string, e.g. "$19.99").',
      example: '$19.99',
      hasEmailCompatibilityNotes: false,
    },
    'cta-href': {
      type: 'url',
      required: true,
      description: 'Link target for the CTA button.',
      example: 'https://example.com/product',
      hasEmailCompatibilityNotes: false,
    },
    'cta-label': {
      type: 'string',
      required: false,
      description: 'CTA button text. Defaults to "Shop now".',
      example: 'Buy now',
      default: 'Shop now',
      hasEmailCompatibilityNotes: false,
    },
    'background-color': {
      type: 'color',
      required: false,
      description: 'Card background colour.',
      example: '#ffffff',
      default: '#ffffff',
      hasEmailCompatibilityNotes: false,
      isCssPropAttr: true,
      classHint: 'bg-[#hex]',
    },
  },
};

// ---------------------------------------------------------------------------
// Public registration function — call once at app startup
// ---------------------------------------------------------------------------

/**
 * Register the `<acme-product-card>` component with mailc.
 *
 * MUST be called before any `compile()` invocation. Calling twice will throw
 * "already registered" — guard with isComponentRegistered() if you need
 * idempotent registration.
 */
export function registerProductCard(): void {
  defineComponent({
    type: 'acme-product-card',
    metadata: productCardMetadata,
    compile: compileProductCard,
  });
}
