import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';

describe('compile — smoke test', () => {
  it('compiles a simple body', () => {
    const result = compile(`<mc>
  <mc-body><mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section></mc-body>
</mc>`);
    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toBeNull();
    expect(result.html).toContain('Hello');
  });
});
