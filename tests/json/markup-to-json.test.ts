/**
 * Tests for markup-to-json.ts — .mc markup → MCNode converter.
 *
 * After the <mc> root structural change, markupToJSON() returns an MCNode
 * with type 'mc' as the root. mc-body is a child of mc.
 */

import { describe, it, expect } from 'vitest';
import { markupToJSON } from '../../src/json/markup-to-json.js';

// ---------------------------------------------------------------------------
// markupToJSON
// ---------------------------------------------------------------------------

describe('markupToJSON', () => {
  // ── Basic structure ────────────────────────────────────────────────

  it('converts simple mc-body with mc-text', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);

    expect(result.type).toBe('mc');
    expect(result.children).toBeDefined();

    const body = result.children![0]!;
    expect(body.type).toBe('mc-body');
    expect(body.children!.length).toBe(1);

    const section = body.children![0]!;
    expect(section.type).toBe('mc-section');

    const column = section.children![0]!;
    expect(column.type).toBe('mc-column');

    const text = column.children![0]!;
    expect(text.type).toBe('mc-text');
    expect(text.content).toBe('Hello');
  });

  // ── Attributes ─────────────────────────────────────────────────────

  it('preserves attributes', () => {
    const source = `<mc>
  <mc-body background-color="#f4f4f4"><mc-section><mc-column><mc-text>Hi</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);

    const body = result.children![0]!;
    expect(body.attributes['background-color']).toBe('#f4f4f4');
  });

  // ── Self-closing tags ──────────────────────────────────────────────

  it('handles self-closing mc-image', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-image src="logo.png" alt="Logo" /></mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);

    const img = result.children![0]!.children![0]!.children![0]!.children![0]!;
    expect(img.type).toBe('mc-image');
    expect(img.attributes.src).toBe('logo.png');
    expect(img.attributes.alt).toBe('Logo');
    expect(img.children).toBeUndefined();
  });

  it('handles self-closing mc-divider', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-divider /></mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);

    const divider = result.children![0]!.children![0]!.children![0]!.children![0]!;
    expect(divider.type).toBe('mc-divider');
  });

  it('handles self-closing mc-spacer', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-spacer height="20px" /></mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);

    const spacer = result.children![0]!.children![0]!.children![0]!.children![0]!;
    expect(spacer.type).toBe('mc-spacer');
    expect(spacer.attributes.height).toBe('20px');
  });

  // ── Content with expressions ───────────────────────────────────────

  it('preserves template expressions in content', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>Hello {{customer.name}}!</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);

    const text = result.children![0]!.children![0]!.children![0]!.children![0]!;
    expect(text.content).toBe('Hello {{customer.name}}!');
  });

  it('preserves raw expressions in content', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>{{{rawHtml}}}</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);

    const text = result.children![0]!.children![0]!.children![0]!.children![0]!;
    expect(text.content).toBe('{{{rawHtml}}}');
  });

  it('preserves expression with fallback', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>{{name || "Customer"}}</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);

    const text = result.children![0]!.children![0]!.children![0]!.children![0]!;
    expect(text.content).toBe('{{name || "Customer"}}');
  });

  // ── mc-button with content ─────────────────────────────────────────

  it('converts mc-button with content and href', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-button href="https://example.com">Click Me</mc-button></mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);

    const button = result.children![0]!.children![0]!.children![0]!.children![0]!;
    expect(button.type).toBe('mc-button');
    expect(button.attributes.href).toBe('https://example.com');
    expect(button.content).toBe('Click Me');
  });

  // ── No children or content → clean MCNode ─────────────────────────

  it('omits children key when node has no children', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-divider /></mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);

    const divider = result.children![0]!.children![0]!.children![0]!.children![0]!;
    expect(divider.children).toBeUndefined();
  });

  it('omits content key when node has no content', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-divider /></mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);

    const section = result.children![0]!.children![0]!;
    expect(section.content).toBeUndefined();
  });

  // ── Multiple children ──────────────────────────────────────────────

  it('handles multiple children in a column', () => {
    const source = `
<mc>
  <mc-body>
  <mc-section>
    <mc-column>
      <mc-text>First</mc-text>
      <mc-divider />
      <mc-text>Second</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;
    const result = markupToJSON(source);

    const column = result.children![0]!.children![0]!.children![0]!;
    expect(column.children!.length).toBe(3);
    expect(column.children![0]!.type).toBe('mc-text');
    expect(column.children![0]!.content).toBe('First');
    expect(column.children![1]!.type).toBe('mc-divider');
    expect(column.children![2]!.type).toBe('mc-text');
    expect(column.children![2]!.content).toBe('Second');
  });

  // ── Two-column layout ─────────────────────────────────────────────

  it('handles two-column layout', () => {
    const source = `
<mc>
  <mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Left</mc-text>
    </mc-column>
    <mc-column>
      <mc-text>Right</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;
    const result = markupToJSON(source);

    const section = result.children![0]!.children![0]!;
    expect(section.children!.length).toBe(2);
    expect(section.children![0]!.children![0]!.content).toBe('Left');
    expect(section.children![1]!.children![0]!.content).toBe('Right');
  });
});
