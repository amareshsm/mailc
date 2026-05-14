/**
 * @file tests/introspect/data-contract.test.ts
 *
 * Unit tests for `extractDataContract()` — the static AST analysis that
 * discovers which data fields a template requires, which are optional, and
 * what each loop iterates over.
 *
 * Tests use `parse(tokenize(source))` to build real ASTs, matching the
 * actual call chain users and the CLI will use.
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from '../../src/tokenizer/index.js';
import { parse } from '../../src/parser/index.js';
import { introspect } from '../../src/introspect/index.js';
import type { DataContract } from '../../src/introspect/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parses a .mc source string and extracts its data contract. */
function contract(source: string): DataContract {
  const tokens = tokenize(source);
  const ast = parse(tokens);
  return introspect.dataContract(ast);
}

/** Returns the paths present in required[]. */
function requiredPaths(c: DataContract): string[] {
  return c.required.map((f) => f.path);
}

/** Returns the paths present in optional[]. */
function optionalPaths(c: DataContract): string[] {
  return c.optional.map((f) => f.path);
}

// ---------------------------------------------------------------------------
// Minimal template
// ---------------------------------------------------------------------------

describe('extractDataContract — empty template', () => {
  it('returns empty contract for a template with no expressions', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text>Hello world</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    expect(c.required).toHaveLength(0);
    expect(c.optional).toHaveLength(0);
    expect(c.loops).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Required fields
// ---------------------------------------------------------------------------

describe('extractDataContract — required fields', () => {
  it('detects a single top-level expression', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text>Hello {{user.name}}</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    expect(requiredPaths(c)).toContain('user.name');
    expect(c.required[0]?.usedIn).toBe('expression');
  });

  it('detects multiple root-level paths', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text>{{user.name}} — {{order.id}}</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    const paths = requiredPaths(c);
    expect(paths).toContain('user.name');
    expect(paths).toContain('order.id');
  });

  it('detects expressions in attribute values', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-image src="{{product.imageUrl}}" alt="{{product.name}}" />
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    const paths = requiredPaths(c);
    expect(paths).toContain('product.imageUrl');
    expect(paths).toContain('product.name');
    // At least one should be tagged as 'attribute'
    expect(c.required.some((f) => f.usedIn === 'attribute')).toBe(true);
  });

  it('deduplicates the same path used multiple times', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text>{{user.name}}</mc-text>
              <mc-text>Hello again {{user.name}}</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    const nameFields = c.required.filter((f) => f.path === 'user.name');
    // Deduplicated to one entry with 2 locations
    expect(nameFields).toHaveLength(1);
    expect(nameFields[0]?.locations.length).toBeGreaterThanOrEqual(2);
  });

  it('strips .length from array paths', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text>{{cart.items.length}} items</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    // Should be recorded as "cart.items", not "cart.items.length"
    expect(requiredPaths(c)).toContain('cart.items');
    expect(requiredPaths(c)).not.toContain('cart.items.length');
  });

  it('records the source location on required fields', () => {
    const c = contract(`<mc><mc-body><mc-section><mc-column><mc-text>{{user.name}}</mc-text></mc-column></mc-section></mc-body></mc>`);
    const field = c.required.find((f) => f.path === 'user.name');
    expect(field).toBeDefined();
    expect(field?.locations[0]?.line).toBeGreaterThan(0);
    expect(field?.locations[0]?.col).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Optional fields (inside mc-if)
// ---------------------------------------------------------------------------

describe('extractDataContract — optional fields', () => {
  it('classifies fields inside mc-if as optional', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-if condition="user.isPro">
                <mc-text>{{user.proFeature}}</mc-text>
              </mc-if>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    expect(optionalPaths(c)).toContain('user.proFeature');
    expect(requiredPaths(c)).not.toContain('user.proFeature');
  });

  it('records the gating condition on optional fields', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-if condition="user.isPro">
                <mc-text>{{user.tier}}</mc-text>
              </mc-if>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    const field = c.optional.find((f) => f.path === 'user.tier');
    expect(field?.condition).toBe("user.isPro");
  });

  it('classifies fields inside mc-else as optional with no condition', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-if condition="user.isPro">
                <mc-text>Pro</mc-text>
              </mc-if>
              <mc-else>
                <mc-text>{{user.freeTrialDays}}</mc-text>
              </mc-else>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    expect(optionalPaths(c)).toContain('user.freeTrialDays');
    const field = c.optional.find((f) => f.path === 'user.freeTrialDays');
    expect(field?.condition).toBeUndefined(); // mc-else has no condition
  });

  it('extracts paths from the condition expression itself', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-if condition="order.total > 100">
                <mc-text>Free shipping!</mc-text>
              </mc-if>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    // "order.total" is in the condition — classified as optional (the condition
    // itself only matters when branching, so the field is conditional)
    const paths = [...requiredPaths(c), ...optionalPaths(c)];
    expect(paths).toContain('order.total');
  });

  it('does NOT put a condition path in both required AND optional (Bug 1)', () => {
    // When condition="order.discount != null" the path "order.discount" is
    // extracted from the condition AND appears again in the body. It must end
    // up in exactly one map — not both.
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-if condition="order.discount != null">
                <mc-text>Discount: {{order.discount}}</mc-text>
              </mc-if>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    const inRequired = requiredPaths(c).includes('order.discount');
    const inOptional = optionalPaths(c).includes('order.discount');
    // Must be in exactly one map
    expect(inRequired && inOptional).toBe(false);
    // Must be in at least one map
    expect(inRequired || inOptional).toBe(true);
  });

  it('extracts bare (no-dot) condition variables — limitation fix', () => {
    // condition="isLoggedIn" has no dot — was silently dropped before the fix.
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-if condition="isLoggedIn">
                <mc-text>Welcome back!</mc-text>
              </mc-if>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    const paths = [...requiredPaths(c), ...optionalPaths(c)];
    expect(paths).toContain('isLoggedIn');
  });

  it('does NOT include JS keywords extracted from conditions', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-if condition="user.address != null">
                <mc-text>Address on file</mc-text>
              </mc-if>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    const paths = [...requiredPaths(c), ...optionalPaths(c)];
    expect(paths).not.toContain('null');
    expect(paths).not.toContain('undefined');
    expect(paths).not.toContain('true');
    expect(paths).not.toContain('false');
  });

  it('promotes a path from optional to required when seen outside mc-if too', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-if condition="user.isPro">
                <mc-text>{{user.name}}</mc-text>
              </mc-if>
              <mc-text>Welcome {{user.name}}</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    // user.name seen inside mc-if first, then unconditionally — must be required
    expect(requiredPaths(c)).toContain('user.name');
    expect(optionalPaths(c)).not.toContain('user.name');
  });
});

// ---------------------------------------------------------------------------
// Loops
// ---------------------------------------------------------------------------

describe('extractDataContract — loops', () => {
  it('records a loop entry for mc-each', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-each items="order.items" as="item">
                <mc-text>{{item.name}}</mc-text>
              </mc-each>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    expect(c.loops).toHaveLength(1);
    expect(c.loops[0]?.variable).toBe('item');
    expect(c.loops[0]?.source).toBe('order.items');
  });

  it('records fields accessed on the loop variable in usedPaths', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-each items="order.items" as="item">
                <mc-text>{{item.name}} — {{item.price}}</mc-text>
              </mc-each>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    const loop = c.loops[0];
    expect(loop?.usedPaths).toContain('item.name');
    expect(loop?.usedPaths).toContain('item.price');
  });

  it('does NOT add loop-scoped paths to required or optional', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-each items="products" as="product">
                <mc-text>{{product.title}}</mc-text>
              </mc-each>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    expect(requiredPaths(c)).not.toContain('product.title');
    expect(optionalPaths(c)).not.toContain('product.title');
  });

  it('records the loop source as a required field', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-each items="order.items" as="item">
                <mc-text>{{item.name}}</mc-text>
              </mc-each>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    expect(requiredPaths(c)).toContain('order.items');
  });

  it('records the loop source as optional when the mc-each is inside mc-if', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-if condition="order.hasItems">
                <mc-each items="order.items" as="item">
                  <mc-text>{{item.name}}</mc-text>
                </mc-each>
              </mc-if>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    expect(optionalPaths(c)).toContain('order.items');
    expect(requiredPaths(c)).not.toContain('order.items');
  });

  it('handles nested loops correctly', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-each items="categories" as="category">
                <mc-text>{{category.name}}</mc-text>
                <mc-each items="category.products" as="product">
                  <mc-text>{{product.title}}</mc-text>
                </mc-each>
              </mc-each>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    expect(c.loops).toHaveLength(2);

    const outer = c.loops.find((l) => l.variable === 'category');
    expect(outer?.source).toBe('categories');
    expect(outer?.usedPaths).toContain('category.name');

    const inner = c.loops.find((l) => l.variable === 'product');
    expect(inner?.source).toBe('category.products');
    expect(inner?.usedPaths).toContain('product.title');
  });

  it('records the loop location', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-each items="items" as="item">
                <mc-text>{{item.name}}</mc-text>
              </mc-each>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    expect(c.loops[0]?.location.line).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Fallback expressions
// ---------------------------------------------------------------------------

describe('extractDataContract — fallback expressions', () => {
  it('records the path from a fallback expression, ignoring the fallback literal', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text>Hi {{user.firstName || "there"}}</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    expect(requiredPaths(c)).toContain('user.firstName');
  });
});

// ---------------------------------------------------------------------------
// introspect.dataContract integration test
// ---------------------------------------------------------------------------

describe('introspect.dataContract — public API', () => {
  it('is accessible on the introspect object', () => {
    expect(typeof introspect.dataContract).toBe('function');
  });

  it('returns the correct shape for a realistic invoice template', () => {
    const c = contract(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text>Dear {{customer.name}},</mc-text>
              <mc-text>Order: {{order.id}}</mc-text>
              <mc-each items="order.items" as="item">
                <mc-text>{{item.name}} x{{item.qty}} — {{item.price}}</mc-text>
              </mc-each>
              <mc-if condition="order.discount != null">
                <mc-text>Discount: {{order.discount}}</mc-text>
              </mc-if>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);

    // Required: customer.name, order.id, order.items
    expect(requiredPaths(c)).toContain('customer.name');
    expect(requiredPaths(c)).toContain('order.id');
    expect(requiredPaths(c)).toContain('order.items');

    // order.discount is in the condition expression — extracted at root scope
    // (before conditionStack is pushed), so it lands in required.
    // It must not appear in BOTH maps — exactly one.
    const discountInRequired = requiredPaths(c).includes('order.discount');
    const discountInOptional = optionalPaths(c).includes('order.discount');
    expect(discountInRequired && discountInOptional).toBe(false);
    expect(discountInRequired || discountInOptional).toBe(true);

    // Loop: item iterates over order.items
    const loop = c.loops.find((l) => l.source === 'order.items');
    expect(loop).toBeDefined();
    expect(loop?.usedPaths).toContain('item.name');
    expect(loop?.usedPaths).toContain('item.qty');
    expect(loop?.usedPaths).toContain('item.price');
  });
});
