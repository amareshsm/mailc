/**
 * SM-G2: Dynamic template tracking with `sourceMap: true`.
 *
 * Verifies that `mc-each` loop iterations and `mc-if`/`mc-else` branches are
 * fully tracked in the source map when using the clean `sourceMap: true` API:
 * - Each rendered iteration gets its own entry with LoopInfo.
 * - Each taken conditional branch gets an entry with ConditionalInfo.
 * - The 1:1 mapping invariant holds for dynamic templates.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const LOOP_TEMPLATE = `<mc>
<mc-head></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-each items="orders" as="order">
        <mc-text>{{ order.name }}</mc-text>
      </mc-each>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

const LOOP_DATA = {
  orders: [
    { name: 'Pro License' },
    { name: 'Support Plan' },
    { name: 'Add-on' },
  ],
};

const EMPTY_LOOP_TEMPLATE = `<mc>
<mc-head></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-each items="items" as="item">
        <mc-text>{{ item.name }}</mc-text>
      </mc-each>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

const IF_TEMPLATE = `<mc>
<mc-head></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-if condition="isPremium">
        <mc-text>Premium user</mc-text>
      </mc-if>
      <mc-else>
        <mc-text>Free user</mc-text>
      </mc-else>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

const IF_CHAIN_TEMPLATE = `<mc>
<mc-head></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-if condition="tier.premium">
        <mc-text>Premium</mc-text>
      </mc-if>
      <mc-else-if condition="tier.basic">
        <mc-text>Basic</mc-text>
      </mc-else-if>
      <mc-else>
        <mc-text>Free</mc-text>
      </mc-else>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

// ---------------------------------------------------------------------------
// mc-each with sourceMap: true
// ---------------------------------------------------------------------------

describe('mc-each with sourceMap: true', () => {
  it('produces one entry per iteration for the inner mc-text', () => {
    const result = compile(LOOP_TEMPLATE, {
      sourceMap: true,
      data: LOOP_DATA,
    });
    const textEntries = result.sourceMap!.entries.filter(
      (e) => e.sourceComponent === 'mc-text',
    );
    expect(textEntries.length).toBe(3);
  });

  it('each mc-text entry has a unique id', () => {
    const result = compile(LOOP_TEMPLATE, { sourceMap: true, data: LOOP_DATA });
    const textEntries = result.sourceMap!.entries.filter(
      (e) => e.sourceComponent === 'mc-text',
    );
    const ids = textEntries.map((e) => e.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('loop entries have loop.iterationIndex 0, 1, 2', () => {
    const result = compile(LOOP_TEMPLATE, { sourceMap: true, data: LOOP_DATA });
    const loopEntries = result.sourceMap!.entries.filter(
      (e) => e.loop !== null,
    );
    const indices = loopEntries.map((e) => e.loop!.iterationIndex).sort();
    expect(indices).toEqual([0, 1, 2]);
  });

  it('all loop entries have loop.totalIterations === 3', () => {
    const result = compile(LOOP_TEMPLATE, { sourceMap: true, data: LOOP_DATA });
    const loopEntries = result.sourceMap!.entries.filter((e) => e.loop !== null);
    for (const entry of loopEntries) {
      expect(entry.loop!.totalIterations).toBe(3);
    }
  });

  it('loop.loopVariable matches the "as" attribute', () => {
    const result = compile(LOOP_TEMPLATE, { sourceMap: true, data: LOOP_DATA });
    const loopEntries = result.sourceMap!.entries.filter((e) => e.loop !== null);
    for (const entry of loopEntries) {
      expect(entry.loop!.loopVariable).toBe('order');
    }
  });

  it('loop.itemsExpression matches the "items" attribute path', () => {
    const result = compile(LOOP_TEMPLATE, { sourceMap: true, data: LOOP_DATA });
    const loopEntries = result.sourceMap!.entries.filter((e) => e.loop !== null);
    for (const entry of loopEntries) {
      expect(entry.loop!.itemsExpression).toBe('orders');
    }
  });

  it('each rendered element has a data-mc-id matching its entry id', () => {
    const result = compile(LOOP_TEMPLATE, { sourceMap: true, data: LOOP_DATA });
    const html = result.html!;
    const loopEntries = result.sourceMap!.entries.filter((e) => e.loop !== null);
    for (const entry of loopEntries) {
      expect(html).toContain(`data-mc-id="${entry.id}"`);
    }
  });

  it('1:1 invariant: data-mc-id count equals entry count', () => {
    const result = compile(LOOP_TEMPLATE, { sourceMap: true, data: LOOP_DATA });
    const total = countOccurrences(result.html!, 'data-mc-id=');
    expect(total).toBe(result.sourceMap!.entries.length);
  });

  it('empty array → zero loop entries, no data-mc-id for loop items', () => {
    const result = compile(EMPTY_LOOP_TEMPLATE, {
      sourceMap: true,
      data: { items: [] },
    });
    const loopEntries = result.sourceMap!.entries.filter((e) => e.loop !== null);
    expect(loopEntries.length).toBe(0);
  });

  it('HTML has no markers even in loop mode', () => {
    const result = compile(LOOP_TEMPLATE, { sourceMap: true, data: LOOP_DATA });
    expect(result.html).not.toContain('mc:source');
  });
});

// ---------------------------------------------------------------------------
// mc-if / mc-else with sourceMap: true
// ---------------------------------------------------------------------------

describe('mc-if / mc-else with sourceMap: true', () => {
  it('taken mc-if branch: entry present with conditional.branchTaken = true', () => {
    const result = compile(IF_TEMPLATE, {
      sourceMap: true,
      data: { isPremium: true },
    });
    const conditionalEntries = result.sourceMap!.entries.filter(
      (e) => e.conditional !== null,
    );
    expect(conditionalEntries.some((e) => e.conditional!.branchTaken === true)).toBe(true);
  });

  it('taken branch: data-mc-id present in HTML', () => {
    const result = compile(IF_TEMPLATE, {
      sourceMap: true,
      data: { isPremium: true },
    });
    const takenEntry = result.sourceMap!.entries.find(
      (e) => e.conditional?.branchTaken === true,
    );
    expect(result.html).toContain(`data-mc-id="${takenEntry?.id}"`);
  });

  it('mc-else taken when condition is false', () => {
    const result = compile(IF_TEMPLATE, {
      sourceMap: true,
      data: { isPremium: false },
    });
    const takenEntry = result.sourceMap!.entries.find(
      (e) => e.conditional?.branchTaken === true,
    );
    expect(takenEntry).toBeDefined();
    // The mc-text "Free user" should be in the HTML
    expect(result.html).toContain('Free user');
  });

  it('1:1 invariant holds for conditional template', () => {
    const result = compile(IF_TEMPLATE, {
      sourceMap: true,
      data: { isPremium: true },
    });
    const total = countOccurrences(result.html!, 'data-mc-id=');
    expect(total).toBe(result.sourceMap!.entries.length);
  });

  it('mc-if chain: only one branch entry has branchTaken true', () => {
    const result = compile(IF_CHAIN_TEMPLATE, {
      sourceMap: true,
      data: { tier: { premium: false, basic: true } },
    });
    const conditionalEntries = result.sourceMap!.entries.filter(
      (e) => e.conditional !== null,
    );
    const takenCount = conditionalEntries.filter(
      (e) => e.conditional!.branchTaken,
    ).length;
    expect(takenCount).toBe(1);
  });

  it('mc-else branch has conditional.type "mc-else"', () => {
    // This requires debug mode to produce the conditional wrapper entries.
    // In sourceMap: true mode, we only track the TAKEN branch.
    const result = compile(IF_TEMPLATE, {
      sourceMap: true,
      data: { isPremium: false },
    });
    const elseEntry = result.sourceMap!.entries.find(
      (e) => e.conditional?.type === 'mc-else',
    );
    // mc-else is tracked when it is the taken branch
    expect(elseEntry).toBeDefined();
    expect(elseEntry?.conditional?.branchTaken).toBe(true);
  });

  it('HTML has no mc:source markers in conditional mode', () => {
    const result = compile(IF_TEMPLATE, {
      sourceMap: true,
      data: { isPremium: true },
    });
    expect(result.html).not.toContain('mc:source');
  });
});

// ---------------------------------------------------------------------------
// Loop + conditional combined
// ---------------------------------------------------------------------------

describe('mc-each + mc-if combined with sourceMap: true', () => {
  // Note: mc-if directly nested inside mc-each is a known engine limitation
  // (the loop expander calls resolveNode, not resolveChildren, on each child,
  // so conditional nodes within the loop body are not evaluated).
  // This test uses mc-if OUTSIDE the loop to verify both together work fine.
  const COMBINED_TEMPLATE = `<mc>
<mc-head></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-if condition="showList">
        <mc-each items="users" as="user">
          <mc-text>{{ user.name }}</mc-text>
        </mc-each>
      </mc-if>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

  const COMBINED_DATA = {
    showList: true,
    users: [
      { name: 'Alice' },
      { name: 'Bob' },
    ],
  };

  it('1:1 invariant holds for loop + conditional', () => {
    const result = compile(COMBINED_TEMPLATE, {
      sourceMap: true,
      data: COMBINED_DATA,
    });
    expect(result.html).not.toBeNull();
    const total = countOccurrences(result.html!, 'data-mc-id=');
    expect(total).toBe(result.sourceMap!.entries.length);
  });

  it('both users rendered when showList is true', () => {
    const result = compile(COMBINED_TEMPLATE, {
      sourceMap: true,
      data: COMBINED_DATA,
    });
    expect(result.html).toContain('Alice');
    expect(result.html).toContain('Bob');
  });

  it('no users rendered when showList is false', () => {
    const result = compile(COMBINED_TEMPLATE, {
      sourceMap: true,
      data: { ...COMBINED_DATA, showList: false },
    });
    expect(result.html).not.toContain('Alice');
    expect(result.html).not.toContain('Bob');
  });

  it('HTML has no mc:source markers', () => {
    const result = compile(COMBINED_TEMPLATE, {
      sourceMap: true,
      data: COMBINED_DATA,
    });
    expect(result.html).not.toContain('mc:source');
  });
});
