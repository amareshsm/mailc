/**
 * Tests for evaluateCondition.
 *
 * Written from the perspective of a template author:
 * "I put this condition in my mc-if — does it behave as I expect?"
 *
 * Covers:
 * - Backward-compatible dot-path truthiness
 * - String comparisons (all 6 operators + strict variants)
 * - Numeric comparisons
 * - Array length comparisons
 * - Null / undefined checks
 * - Logical AND / OR
 * - Negation
 * - Parentheses for grouping
 * - Compound expressions
 * - Keyword literals (true, false, null, undefined)
 * - Edge cases and misuse
 */

import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../../src/template/index.js';

// ===========================================================================
// 1 — Simple dot-path truthiness (backward-compatible behaviour)
// ===========================================================================

describe('simple dot-path truthiness', () => {
  it('resolves a top-level boolean true', () => {
    expect(evaluateCondition({ isActive: true }, 'isActive')).toBe(true);
  });

  it('resolves a top-level boolean false', () => {
    expect(evaluateCondition({ isActive: false }, 'isActive')).toBe(false);
  });

  it('non-empty string is truthy', () => {
    expect(evaluateCondition({ name: 'Sarah' }, 'name')).toBe(true);
  });

  it('empty string is falsy', () => {
    expect(evaluateCondition({ name: '' }, 'name')).toBe(false);
  });

  it('non-zero number is truthy', () => {
    expect(evaluateCondition({ count: 5 }, 'count')).toBe(true);
  });

  it('zero is falsy', () => {
    expect(evaluateCondition({ count: 0 }, 'count')).toBe(false);
  });

  it('null is falsy', () => {
    expect(evaluateCondition({ val: null }, 'val')).toBe(false);
  });

  it('missing path is falsy', () => {
    expect(evaluateCondition({}, 'missing')).toBe(false);
  });

  it('empty array is falsy (email template convention)', () => {
    expect(evaluateCondition({ items: [] }, 'items')).toBe(false);
  });

  it('non-empty array is truthy', () => {
    expect(evaluateCondition({ items: [1, 2] }, 'items')).toBe(true);
  });

  it('any plain object is truthy', () => {
    expect(evaluateCondition({ meta: {} }, 'meta')).toBe(true);
  });

  it('resolves nested dot-path', () => {
    expect(evaluateCondition({ order: { paid: true } }, 'order.paid')).toBe(true);
    expect(evaluateCondition({ order: { paid: false } }, 'order.paid')).toBe(false);
  });

  it('returns false when intermediate path segment is missing', () => {
    expect(evaluateCondition({}, 'order.paid')).toBe(false);
  });
});

// ===========================================================================
// 2 — String equality (==  and  ===)
// ===========================================================================

describe('string equality — ==', () => {
  it('matches when plan equals the literal', () => {
    expect(evaluateCondition({ plan: 'pro' }, "plan == 'pro'")).toBe(true);
  });

  it('does NOT match when plan is a different value', () => {
    // This was silently broken with the old simple-path evaluator.
    expect(evaluateCondition({ plan: 'basic' }, "plan == 'pro'")).toBe(false);
  });

  it('does NOT match when the field is missing', () => {
    expect(evaluateCondition({}, "plan == 'pro'")).toBe(false);
  });

  it('handles double-quoted string literal', () => {
    expect(evaluateCondition({ status: 'active' }, 'status == "active"')).toBe(true);
    expect(evaluateCondition({ status: 'inactive' }, 'status == "active"')).toBe(false);
  });

  it('resolves nested path on left side', () => {
    expect(evaluateCondition({ user: { plan: 'enterprise' } }, "user.plan == 'enterprise'")).toBe(true);
    expect(evaluateCondition({ user: { plan: 'basic' } }, "user.plan == 'enterprise'")).toBe(false);
  });

  it('loose == treats null and undefined as equal', () => {
    // Template author checks: "is this field absent or null?"
    expect(evaluateCondition({ discount: null }, 'discount == null')).toBe(true);
    expect(evaluateCondition({}, 'discount == null')).toBe(true); // undefined == null
  });

  it('loose == does NOT treat a real value as null', () => {
    expect(evaluateCondition({ discount: 0.1 }, 'discount == null')).toBe(false);
  });
});

describe('string equality — ===  (strict)', () => {
  it('matches when value and type both match', () => {
    expect(evaluateCondition({ tier: 'gold' }, "tier === 'gold'")).toBe(true);
  });

  it('does NOT match a different value', () => {
    expect(evaluateCondition({ tier: 'silver' }, "tier === 'gold'")).toBe(false);
  });

  it('strict === distinguishes null from undefined', () => {
    expect(evaluateCondition({ field: null }, 'field === null')).toBe(true);
    expect(evaluateCondition({}, 'field === null')).toBe(false); // undefined !== null
  });

  it('strict === distinguishes string from number', () => {
    expect(evaluateCondition({ count: 0 }, "count === '0'")).toBe(false); // number !== string
    expect(evaluateCondition({ count: 0 }, 'count === 0')).toBe(true);
  });
});

// ===========================================================================
// 3 — String inequality (!= and !==)
// ===========================================================================

describe('string inequality — !=', () => {
  it('returns true when value differs from literal', () => {
    expect(evaluateCondition({ status: 'inactive' }, "status != 'active'")).toBe(true);
  });

  it('returns false when value matches literal', () => {
    expect(evaluateCondition({ status: 'active' }, "status != 'active'")).toBe(false);
  });

  it('loose != treats null and undefined as equal (both absent)', () => {
    expect(evaluateCondition({ field: null }, 'field != null')).toBe(false);
    expect(evaluateCondition({}, 'field != null')).toBe(false); // undefined == null
  });

  it('returns true when a real value is present', () => {
    expect(evaluateCondition({ field: 'something' }, 'field != null')).toBe(true);
  });
});

describe('string inequality — !==', () => {
  it('returns true when values differ', () => {
    expect(evaluateCondition({ role: 'admin' }, "role !== 'guest'")).toBe(true);
  });

  it('returns false when values are identical', () => {
    expect(evaluateCondition({ role: 'guest' }, "role !== 'guest'")).toBe(false);
  });

  it('strict !== treats undefined as different from null', () => {
    expect(evaluateCondition({}, 'field !== null')).toBe(true); // undefined !== null
  });
});

// ===========================================================================
// 4 — Numeric comparisons
// ===========================================================================

describe('numeric comparisons — >', () => {
  it('returns true when left is greater', () => {
    expect(evaluateCondition({ total: 150 }, 'total > 100')).toBe(true);
  });

  it('returns false when left is equal', () => {
    expect(evaluateCondition({ total: 100 }, 'total > 100')).toBe(false);
  });

  it('returns false when left is less', () => {
    expect(evaluateCondition({ total: 50 }, 'total > 100')).toBe(false);
  });
});

describe('numeric comparisons — >=', () => {
  it('returns true when left equals threshold', () => {
    expect(evaluateCondition({ total: 100 }, 'total >= 100')).toBe(true);
  });

  it('returns true when left exceeds threshold', () => {
    expect(evaluateCondition({ total: 101 }, 'total >= 100')).toBe(true);
  });

  it('returns false when left is below threshold', () => {
    expect(evaluateCondition({ total: 99 }, 'total >= 100')).toBe(false);
  });
});

describe('numeric comparisons — <', () => {
  it('returns true when left is less', () => {
    expect(evaluateCondition({ score: 5 }, 'score < 10')).toBe(true);
  });

  it('returns false when left equals the bound', () => {
    expect(evaluateCondition({ score: 10 }, 'score < 10')).toBe(false);
  });

  it('returns false when left is greater', () => {
    expect(evaluateCondition({ score: 15 }, 'score < 10')).toBe(false);
  });
});

describe('numeric comparisons — <=', () => {
  it('returns true when left equals the bound', () => {
    expect(evaluateCondition({ qty: 3 }, 'qty <= 3')).toBe(true);
  });

  it('returns true when left is below the bound', () => {
    expect(evaluateCondition({ qty: 2 }, 'qty <= 3')).toBe(true);
  });

  it('returns false when left exceeds the bound', () => {
    expect(evaluateCondition({ qty: 4 }, 'qty <= 3')).toBe(false);
  });
});

// ===========================================================================
// 5 — Array length comparisons (common email pattern)
// ===========================================================================

describe('array length comparisons', () => {
  it('items.length > 0 is true for a non-empty array', () => {
    expect(evaluateCondition({ items: ['a', 'b'] }, 'items.length > 0')).toBe(true);
  });

  it('items.length > 0 is false for an empty array', () => {
    expect(evaluateCondition({ items: [] }, 'items.length > 0')).toBe(false);
  });

  it('items.length > 1 is true when array has 2 elements', () => {
    expect(evaluateCondition({ items: ['a', 'b'] }, 'items.length > 1')).toBe(true);
  });

  it('items.length > 1 is false when array has exactly 1 element', () => {
    expect(evaluateCondition({ items: ['a'] }, 'items.length > 1')).toBe(false);
  });

  it('items.length == 0 is true for an empty array', () => {
    expect(evaluateCondition({ items: [] }, 'items.length == 0')).toBe(true);
  });

  it('items.length >= 3 selects arrays with at least 3 items', () => {
    expect(evaluateCondition({ items: [1, 2, 3] }, 'items.length >= 3')).toBe(true);
    expect(evaluateCondition({ items: [1, 2] }, 'items.length >= 3')).toBe(false);
  });
});

// ===========================================================================
// 6 — Logical AND
// ===========================================================================

describe('logical AND — &&', () => {
  it('returns true when both sides are truthy', () => {
    expect(evaluateCondition({ verified: true, active: true }, 'verified && active')).toBe(true);
  });

  it('returns false when left side is falsy', () => {
    expect(evaluateCondition({ verified: false, active: true }, 'verified && active')).toBe(false);
  });

  it('returns false when right side is falsy', () => {
    expect(evaluateCondition({ verified: true, active: false }, 'verified && active')).toBe(false);
  });

  it('returns false when both sides are falsy', () => {
    expect(evaluateCondition({ verified: false, active: false }, 'verified && active')).toBe(false);
  });

  it('works with comparison on left side', () => {
    const data = { user: { plan: 'pro' }, cart: { total: 150 } };
    expect(evaluateCondition(data, "user.plan == 'pro' && cart.total > 100")).toBe(true);
    expect(evaluateCondition({ ...data, cart: { total: 50 } }, "user.plan == 'pro' && cart.total > 100")).toBe(false);
  });

  it('works with comparison on both sides', () => {
    const data = { score: 85, attempts: 2 };
    expect(evaluateCondition(data, 'score >= 80 && attempts <= 3')).toBe(true);
    expect(evaluateCondition({ score: 70, attempts: 2 }, 'score >= 80 && attempts <= 3')).toBe(false);
  });
});

// ===========================================================================
// 7 — Logical OR
// ===========================================================================

describe('logical OR — ||', () => {
  it('returns true when left side is truthy', () => {
    expect(evaluateCondition({ a: true, b: false }, 'a || b')).toBe(true);
  });

  it('returns true when right side is truthy', () => {
    expect(evaluateCondition({ a: false, b: true }, 'a || b')).toBe(true);
  });

  it('returns true when both are truthy', () => {
    expect(evaluateCondition({ a: true, b: true }, 'a || b')).toBe(true);
  });

  it('returns false when both sides are falsy', () => {
    expect(evaluateCondition({ a: false, b: false }, 'a || b')).toBe(false);
  });

  it('matches any of multiple plan values', () => {
    const condition = "plan == 'pro' || plan == 'enterprise'";
    expect(evaluateCondition({ plan: 'pro' }, condition)).toBe(true);
    expect(evaluateCondition({ plan: 'enterprise' }, condition)).toBe(true);
    expect(evaluateCondition({ plan: 'basic' }, condition)).toBe(false);
  });

  it('falls back gracefully when primary field missing', () => {
    // Common pattern: show block if either flag is set
    expect(evaluateCondition({ isNew: true }, 'isFeatured || isNew')).toBe(true);
    expect(evaluateCondition({ isFeatured: true }, 'isFeatured || isNew')).toBe(true);
    expect(evaluateCondition({}, 'isFeatured || isNew')).toBe(false);
  });
});

// ===========================================================================
// 8 — Negation (!)
// ===========================================================================

describe('negation — !', () => {
  it('inverts a truthy value to false', () => {
    expect(evaluateCondition({ isGuest: true }, '!isGuest')).toBe(false);
  });

  it('inverts a falsy value to true', () => {
    expect(evaluateCondition({ isGuest: false }, '!isGuest')).toBe(true);
  });

  it('missing path (undefined) negated is true', () => {
    expect(evaluateCondition({}, '!isGuest')).toBe(true);
  });

  it('double negation returns the original truthiness', () => {
    expect(evaluateCondition({ flag: true }, '!!flag')).toBe(true);
    expect(evaluateCondition({ flag: false }, '!!flag')).toBe(false);
  });

  it('negates a comparison result', () => {
    // "show block when plan is NOT basic"
    expect(evaluateCondition({ plan: 'pro' }, "!(plan == 'basic')")).toBe(true);
    expect(evaluateCondition({ plan: 'basic' }, "!(plan == 'basic')")).toBe(false);
  });
});

// ===========================================================================
// 9 — Keyword literals (true, false, null, undefined)
// ===========================================================================

describe('keyword literals', () => {
  it('bare true evaluates to true', () => {
    expect(evaluateCondition({}, 'true')).toBe(true);
  });

  it('bare false evaluates to false', () => {
    expect(evaluateCondition({}, 'false')).toBe(false);
  });

  it('bare null evaluates to false', () => {
    expect(evaluateCondition({}, 'null')).toBe(false);
  });

  it('bare undefined evaluates to false', () => {
    expect(evaluateCondition({}, 'undefined')).toBe(false);
  });

  it('field == true matches a boolean true value', () => {
    expect(evaluateCondition({ confirmed: true }, 'confirmed == true')).toBe(true);
    expect(evaluateCondition({ confirmed: false }, 'confirmed == true')).toBe(false);
  });

  it('field == false matches a boolean false value', () => {
    expect(evaluateCondition({ draft: false }, 'draft == false')).toBe(true);
    expect(evaluateCondition({ draft: true }, 'draft == false')).toBe(false);
  });
});

// ===========================================================================
// 10 — Parentheses for grouping
// ===========================================================================

describe('parentheses', () => {
  it('groups OR before AND: (a || b) && c', () => {
    // Without parens, AND binds tighter: a || (b && c).
    // With parens: (a || b) && c.
    const dataAC = { a: true, b: false, c: true };
    expect(evaluateCondition(dataAC, '(a || b) && c')).toBe(true);  // (T||F)&&T = T
    expect(evaluateCondition({ a: false, b: false, c: true }, '(a || b) && c')).toBe(false); // (F||F)&&T = F
  });

  it('negates a grouped expression', () => {
    const data = { plan: 'basic', active: true };
    // "render block when plan is NOT basic AND user IS active"
    expect(evaluateCondition({ plan: 'pro', active: true }, "!(plan == 'basic') && active")).toBe(true);
    expect(evaluateCondition(data, "!(plan == 'basic') && active")).toBe(false);
  });

  it('nested parens work', () => {
    expect(evaluateCondition({ a: true, b: true, c: true }, '((a && b) || c)')).toBe(true);
    expect(evaluateCondition({ a: false, b: false, c: false }, '((a && b) || c)')).toBe(false);
  });
});

// ===========================================================================
// 11 — Comparing two data paths against each other
// ===========================================================================

describe('path vs path comparisons', () => {
  it('returns true when two paths hold equal values', () => {
    expect(evaluateCondition({ a: 'x', b: 'x' }, 'a == b')).toBe(true);
  });

  it('returns false when two paths hold different values', () => {
    expect(evaluateCondition({ a: 'x', b: 'y' }, 'a == b')).toBe(false);
  });

  it('compares nested paths', () => {
    const data = { cart: { total: 200 }, threshold: { min: 100 } };
    expect(evaluateCondition(data, 'cart.total > threshold.min')).toBe(true);
  });
});

// ===========================================================================
// 12 — Compound / real-world expressions
// ===========================================================================

describe('compound real-world conditions', () => {
  it('loyalty discount: total over threshold AND member', () => {
    const cond = "user.plan == 'free' && cart.items.length > 0";
    expect(evaluateCondition({ user: { plan: 'free' }, cart: { items: ['a'] } }, cond)).toBe(true);
    expect(evaluateCondition({ user: { plan: 'free' }, cart: { items: [] } }, cond)).toBe(false);
    expect(evaluateCondition({ user: { plan: 'pro' }, cart: { items: ['a'] } }, cond)).toBe(false);
  });

  it('verified and not suspended', () => {
    expect(evaluateCondition({ verified: true, suspended: false }, 'verified && !suspended')).toBe(true);
    expect(evaluateCondition({ verified: true, suspended: true }, 'verified && !suspended')).toBe(false);
  });
});

// ===========================================================================
// 13 — Edge cases and error resistance
// ===========================================================================

describe('edge cases', () => {
  it('empty condition string returns false', () => {
    expect(evaluateCondition({}, '')).toBe(false);
  });

  it('whitespace-only condition returns false', () => {
    expect(evaluateCondition({}, '   ')).toBe(false);
  });

  it('condition with extra whitespace still evaluates correctly', () => {
    expect(evaluateCondition({ plan: 'pro' }, "  plan  ==  'pro'  ")).toBe(true);
  });

  it('unknown path returns false without throwing', () => {
    expect(evaluateCondition({}, 'deeply.nested.unknown.path')).toBe(false);
  });

  it('comparing against a numeric literal 0 works', () => {
    expect(evaluateCondition({ retries: 0 }, 'retries == 0')).toBe(true);
    expect(evaluateCondition({ retries: 1 }, 'retries == 0')).toBe(false);
  });

  it('floating point number literal works', () => {
    expect(evaluateCondition({ rate: 1.5 }, 'rate > 1.0')).toBe(true);
    expect(evaluateCondition({ rate: 0.5 }, 'rate > 1.0')).toBe(false);
  });

  it('negative number literal on right side of comparison', () => {
    expect(evaluateCondition({ balance: -5 }, 'balance > -10')).toBe(true);
    expect(evaluateCondition({ balance: -15 }, 'balance > -10')).toBe(false);
    expect(evaluateCondition({ balance: 0 }, 'balance >= -1')).toBe(true);
  });

  it('negative number: minus attached to a field is NOT treated as negative literal', () => {
    // "amount - 10" is not a valid condition path; should not crash
    expect(() => evaluateCondition({ amount: 5 }, 'amount - 10')).not.toThrow();
  });

  it('deeply nested path access', () => {
    const data = { order: { shipping: { express: true } } };
    expect(evaluateCondition(data, 'order.shipping.express')).toBe(true);
  });

  it('null on left side of comparison is safe', () => {
    expect(evaluateCondition({ val: null }, 'val == null')).toBe(true);
    expect(evaluateCondition({ val: null }, 'val != null')).toBe(false);
  });

  it('does not throw on malformed expression', () => {
    expect(() => evaluateCondition({}, '=== ==')).not.toThrow();
    expect(() => evaluateCondition({}, "unclosed == 'string")).not.toThrow();
  });
});
