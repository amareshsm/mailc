import { describe, it, expect } from 'vitest';
import { deepClone } from '../../src/utils/deep-clone.js';
import type { ASTNode } from '../../src/types.js';

describe('deepClone', () => {
  it('clones a primitive', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
  });

  it('clones a plain object', () => {
    const obj = { a: 1, b: 'two', c: true };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
  });

  it('clones a nested object', () => {
    const obj = { a: { b: { c: 3 } } };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned.a).not.toBe(obj.a);
    expect(cloned.a.b).not.toBe(obj.a.b);
  });

  it('clones an array', () => {
    const arr = [1, 2, [3, 4]];
    const cloned = deepClone(arr);
    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
    expect(cloned[2]).not.toBe(arr[2]);
  });

  it('does not share references after clone', () => {
    const original = { items: [{ id: 1 }, { id: 2 }] };
    const cloned = deepClone(original);
    cloned.items[0]!.id = 999;
    expect(original.items[0]!.id).toBe(1);
  });

  it('clones a minimal ASTNode-shaped object', () => {
    const node: ASTNode = {
      type: 'mc-text',
      attributes: { class: 'text-lg' },
      children: [],
      content: [
        {
          type: 'text',
          value: 'Hello ',
          loc: { start: { line: 1, col: 1, offset: 0 }, end: { line: 1, col: 7, offset: 6 } },
        },
        {
          type: 'expression',
          value: 'name',
          raw: false,
          loc: { start: { line: 1, col: 7, offset: 6 }, end: { line: 1, col: 17, offset: 16 } },
        },
      ],
      loc: { start: { line: 1, col: 1, offset: 0 }, end: { line: 1, col: 50, offset: 49 } },
    };

    const cloned = deepClone(node);
    expect(cloned).toEqual(node);
    expect(cloned).not.toBe(node);
    expect(cloned.attributes).not.toBe(node.attributes);
    expect(cloned.content).not.toBe(node.content);
    expect(cloned.content[0]).not.toBe(node.content[0]);

    // Mutating clone should not affect original
    cloned.attributes['class'] = 'text-sm';
    expect(node.attributes['class']).toBe('text-lg');
  });
});
