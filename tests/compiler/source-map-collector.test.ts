/**
 * SM-B: SourceMapCollector unit tests.
 *
 * Tests the SourceMapCollector and NullSourceMapCollector in isolation
 * to verify entry creation, nesting, and build() output.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SourceMapCollector } from '../../src/compiler/source-map-collector.js';
import { NullSourceMapCollector } from '../../src/compiler/null-source-map-collector.js';
import type { ASTNode } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(type: string, line = 3, col = 1): ASTNode {
  return {
    type,
    attributes: { class: 'bg-white', padding: '20px' },
    children: [],
    content: [],
    loc: {
      start: { line, col, offset: 0 },
      end: { line: line + 2, col: 13, offset: 0 },
    },
  };
}

const BUILD_META = {
  sourceFile: 'welcome.mc',
  outputFile: 'welcome.html',
  templateData: null,
  mailcVersion: '0.0.0',
  inputSize: 500,
  outputSize: 2000,
};

// ---------------------------------------------------------------------------
// SourceMapCollector
// ---------------------------------------------------------------------------

describe('SourceMapCollector', () => {
  let collector: SourceMapCollector;

  beforeEach(() => {
    collector = new SourceMapCollector();
  });

  describe('enter()', () => {
    it('returns a unique ID', () => {
      const id1 = collector.enter(makeNode('mc-section'), 'mc-section');
      const id2 = collector.enter(makeNode('mc-column'), 'mc-column');
      expect(id1).not.toBe(id2);
    });

    it('IDs follow sequential entry-N pattern', () => {
      const id1 = collector.enter(makeNode('mc-section'), 'mc-section');
      const id2 = collector.enter(makeNode('mc-column'), 'mc-column');
      expect(id1).toBe('entry-1');
      expect(id2).toBe('entry-2');
    });

    it('records sourceComponent correctly', () => {
      const id = collector.enter(makeNode('mc-section'), 'mc-section');
      const map = collector.build(BUILD_META);
      const entry = map!.entries.find((e) => e.id === id);
      expect(entry?.sourceComponent).toBe('mc-section');
    });

    it('records sourceLoc from the AST node', () => {
      const node = makeNode('mc-section', 7, 3);
      const id = collector.enter(node, 'mc-section');
      const map = collector.build(BUILD_META);
      const entry = map!.entries.find((e) => e.id === id);
      expect(entry?.sourceLoc.startLine).toBe(7);
      expect(entry?.sourceLoc.startCol).toBe(3);
    });

    it('records sourceAttributes from the AST node', () => {
      const id = collector.enter(makeNode('mc-section'), 'mc-section');
      const map = collector.build(BUILD_META);
      const entry = map!.entries.find((e) => e.id === id);
      expect(entry?.sourceAttributes['padding']).toBe('20px');
    });
  });

  describe('emit()', () => {
    it('returns a unique ID different from enter IDs', () => {
      const parentId = collector.enter(makeNode('mc-section'), 'mc-section');
      const emitId = collector.emit(parentId, 'container-table', 'table');
      expect(emitId).not.toBe(parentId);
    });

    it('links emitted entry to parent via parentId', () => {
      const parentId = collector.enter(makeNode('mc-section'), 'mc-section');
      const emitId = collector.emit(parentId, 'container-table', 'table');
      const map = collector.build(BUILD_META);
      const emitted = map!.entries.find((e) => e.id === emitId);
      expect(emitted?.parentId).toBe(parentId);
    });

    it('sets role and outputTag on emitted entry', () => {
      const parentId = collector.enter(makeNode('mc-section'), 'mc-section');
      const emitId = collector.emit(parentId, 'container-table', 'table');
      const map = collector.build(BUILD_META);
      const emitted = map!.entries.find((e) => e.id === emitId);
      expect(emitted?.role).toBe('container-table');
      expect(emitted?.outputTag).toBe('table');
    });

    it('adds emitted ID to parent children array', () => {
      const parentId = collector.enter(makeNode('mc-section'), 'mc-section');
      const emitId = collector.emit(parentId, 'container-table', 'table');
      const map = collector.build(BUILD_META);
      const parent = map!.entries.find((e) => e.id === parentId);
      expect(parent?.children).toContain(emitId);
    });
  });

  describe('addStyle()', () => {
    it('appends a StyleOrigin to the entry', () => {
      const id = collector.enter(makeNode('mc-section'), 'mc-section');
      collector.addStyle(id, { property: 'padding', value: '20px', origin: 'attribute' });
      const map = collector.build(BUILD_META);
      const entry = map!.entries.find((e) => e.id === id);
      expect(entry?.styles).toHaveLength(1);
      expect(entry?.styles[0]?.property).toBe('padding');
    });
  });

  describe('addExpression()', () => {
    it('appends an ExpressionResolution to the entry', () => {
      const id = collector.enter(makeNode('mc-text'), 'mc-text');
      collector.addExpression(id, {
        expression: 'customer.name',
        resolvedValue: 'John',
        dataPath: ['customer', 'name'],
        usedFallback: false,
      });
      const map = collector.build(BUILD_META);
      const entry = map!.entries.find((e) => e.id === id);
      expect(entry?.expressions).toHaveLength(1);
      expect(entry?.expressions[0]?.expression).toBe('customer.name');
    });
  });

  describe('setConditional()', () => {
    it('sets conditional info on an entry', () => {
      const id = collector.enter(makeNode('mc-if'), 'mc-if');
      collector.setConditional(id, { type: 'mc-if', condition: 'user.active', branchTaken: true });
      const map = collector.build(BUILD_META);
      const entry = map!.entries.find((e) => e.id === id);
      expect(entry?.conditional?.branchTaken).toBe(true);
      expect(entry?.conditional?.condition).toBe('user.active');
    });
  });

  describe('setLoop()', () => {
    it('sets loop info on an entry', () => {
      const id = collector.enter(makeNode('mc-each'), 'mc-each');
      collector.setLoop(id, {
        itemsExpression: 'order.items',
        loopVariable: 'item',
        iterationIndex: 0,
        totalIterations: 3,
        iterationData: { name: 'Widget' },
      });
      const map = collector.build(BUILD_META);
      const entry = map!.entries.find((e) => e.id === id);
      expect(entry?.loop?.itemsExpression).toBe('order.items');
      expect(entry?.loop?.iterationIndex).toBe(0);
    });
  });

  describe('build()', () => {
    it('returns an EmailSourceMap with version: 1', () => {
      collector.enter(makeNode('mc-section'), 'mc-section');
      const map = collector.build(BUILD_META);
      expect(map!.version).toBe(1);
    });

    it('sets sourceFile and outputFile from meta', () => {
      collector.enter(makeNode('mc-section'), 'mc-section');
      const map = collector.build(BUILD_META);
      expect(map!.sourceFile).toBe('welcome.mc');
      expect(map!.outputFile).toBe('welcome.html');
    });

    it('stats.sourceComponents equals number of top-level entries', () => {
      const id1 = collector.enter(makeNode('mc-section'), 'mc-section');
      collector.leave(id1);
      collector.enter(makeNode('mc-section'), 'mc-section');
      const map = collector.build(BUILD_META);
      expect(map!.stats.sourceComponents).toBe(2);
    });

    it('stats.outputElements equals total entries (includes emitted)', () => {
      const parentId = collector.enter(makeNode('mc-section'), 'mc-section');
      collector.emit(parentId, 'container-table', 'table');
      const map = collector.build(BUILD_META);
      expect(map!.stats.outputElements).toBe(2);
    });

    it('stats.expansionRatio reflects input vs output size', () => {
      collector.enter(makeNode('mc-section'), 'mc-section');
      const map = collector.build({ ...BUILD_META, inputSize: 500, outputSize: 2000 });
      expect(map!.stats.expansionRatio).toBe(4); // 2000 / 500
    });

    it('entries array contains all entered entries', () => {
      collector.enter(makeNode('mc-section'), 'mc-section');
      collector.enter(makeNode('mc-column'), 'mc-column');
      const map = collector.build(BUILD_META);
      expect(map!.entries).toHaveLength(2);
    });

    it('no collisions when calling enter many times', () => {
      const ids = Array.from({ length: 50 }, (_, i) =>
        collector.enter(makeNode(`mc-text-${i}`), `mc-text-${i}`),
      );
      const unique = new Set(ids);
      expect(unique.size).toBe(50);
    });
  });
});

// ---------------------------------------------------------------------------
// NullSourceMapCollector
// ---------------------------------------------------------------------------

describe('NullSourceMapCollector', () => {
  it('enter() returns empty string', () => {
    const c = new NullSourceMapCollector();
    expect(c.enter(makeNode('mc-section'), 'mc-section')).toBe('');
  });

  it('emit() returns empty string', () => {
    const c = new NullSourceMapCollector();
    expect(c.emit('', 'container-table', 'table')).toBe('');
  });

  it('build() returns null', () => {
    const c = new NullSourceMapCollector();
    expect(c.build(BUILD_META)).toBeNull();
  });

  it('all methods are callable without throwing', () => {
    const c = new NullSourceMapCollector();
    const id = c.enter(makeNode('mc-section'), 'mc-section');
    expect(() => c.leave(id)).not.toThrow();
    expect(() => c.emit('', 'container-table', 'table')).not.toThrow();
    expect(() => c.addStyle('', { property: 'color', value: 'red', origin: 'attribute' })).not.toThrow();
    expect(() => c.addExpression('', { expression: 'x', resolvedValue: 'y', dataPath: [], usedFallback: false })).not.toThrow();
    expect(() => c.setConditional('', { type: 'mc-if', condition: 'x', branchTaken: true })).not.toThrow();
    expect(() => c.setLoop('', { itemsExpression: 'x', loopVariable: 'i', iterationIndex: 0, totalIterations: 1, iterationData: {} })).not.toThrow();
  });
});
