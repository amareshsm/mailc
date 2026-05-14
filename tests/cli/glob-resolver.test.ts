/**
 * Tests for the glob resolver module.
 *
 * Tests pattern detection, glob base splitting, and file-system glob
 * resolution. Pattern matching correctness is delegated to picomatch
 * (battle-tested); we test that our integration wires it correctly.
 *
 * @module tests/cli/glob-resolver
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  isGlobPattern,
  splitGlobBase,
  resolveGlob,
} from '../../src/cli/glob-resolver.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailc-glob-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createFile(relativePath: string, content = ''): void {
  const full = path.join(tmpDir, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
}

// ---------------------------------------------------------------------------
// isGlobPattern()
// ---------------------------------------------------------------------------

describe('isGlobPattern()', () => {
  it('returns true for patterns with *', () => {
    expect(isGlobPattern('*.mc')).toBe(true);
    expect(isGlobPattern('src/**/*.mc')).toBe(true);
  });

  it('returns true for patterns with ?', () => {
    expect(isGlobPattern('file?.mc')).toBe(true);
  });

  it('returns true for patterns with {', () => {
    expect(isGlobPattern('{a,b}.mc')).toBe(true);
  });

  it('returns true for patterns with [', () => {
    expect(isGlobPattern('[abc].mc')).toBe(true);
  });

  it('returns false for plain file paths', () => {
    expect(isGlobPattern('src/email.mc')).toBe(false);
    expect(isGlobPattern('/abs/path/to/file.json')).toBe(false);
    expect(isGlobPattern('file.mc')).toBe(false);
  });

  it('returns false for directory paths', () => {
    expect(isGlobPattern('src/emails/')).toBe(false);
    expect(isGlobPattern('./templates')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isGlobPattern('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// splitGlobBase()
// ---------------------------------------------------------------------------

describe('splitGlobBase()', () => {
  it('splits simple glob from base dir', () => {
    const result = splitGlobBase('src/*.mc');
    expect(result.baseDir).toBe('src');
    expect(result.globPart).toBe('*.mc');
  });

  it('splits deep glob from base dir', () => {
    const result = splitGlobBase('src/emails/**/*.mc');
    expect(result.baseDir).toBe('src/emails');
    expect(result.globPart).toBe('**/*.mc');
  });

  it('handles glob at root level', () => {
    const result = splitGlobBase('*.mc');
    expect(result.baseDir).toBe('.');
    expect(result.globPart).toBe('*.mc');
  });

  it('handles ** at start', () => {
    const result = splitGlobBase('**/*.mc');
    expect(result.baseDir).toBe('.');
    expect(result.globPart).toBe('**/*.mc');
  });

  it('handles brace expansion in middle segment', () => {
    const result = splitGlobBase('emails/{news,promo}/*.mc');
    expect(result.baseDir).toBe('emails');
    expect(result.globPart).toBe('{news,promo}/*.mc');
  });

  it('handles character class in middle segment', () => {
    const result = splitGlobBase('emails/[Ee]*.mc');
    expect(result.baseDir).toBe('emails');
    expect(result.globPart).toBe('[Ee]*.mc');
  });

  it('handles single segment with no glob chars', () => {
    const result = splitGlobBase('src');
    expect(result.baseDir).toBe('src');
    expect(result.globPart).toBe('');
  });
});

// ---------------------------------------------------------------------------
// resolveGlob() — pattern matching delegated to picomatch
// ---------------------------------------------------------------------------

describe('resolveGlob()', () => {
  it('resolves a simple * pattern', () => {
    createFile('email1.mc');
    createFile('email2.mc');
    createFile('readme.txt');

    const result = resolveGlob(path.join(tmpDir, '*.mc'));

    expect(result.files).toHaveLength(2);
    expect(result.files.every((f) => f.endsWith('.mc'))).toBe(true);
    expect(result.baseDir).toBe(tmpDir);
  });

  it('resolves a ** pattern across directories', () => {
    createFile('a/email.mc');
    createFile('b/c/email.mc');
    createFile('d/readme.txt');

    const result = resolveGlob(path.join(tmpDir, '**/*.mc'));

    expect(result.files).toHaveLength(2);
    expect(result.files.every((f) => f.endsWith('.mc'))).toBe(true);
  });

  it('resolves a ? pattern for single-char substitution', () => {
    createFile('mail1.mc');
    createFile('mail2.mc');
    createFile('mailer.mc');

    const result = resolveGlob(path.join(tmpDir, 'mail?.mc'));

    expect(result.files).toHaveLength(2);
    const basenames = result.files.map((f) => path.basename(f));
    expect(basenames).toContain('mail1.mc');
    expect(basenames).toContain('mail2.mc');
  });

  it('resolves {a,b} brace expansion', () => {
    createFile('news/email.mc');
    createFile('promo/email.mc');
    createFile('blog/email.mc');

    const result = resolveGlob(path.join(tmpDir, '{news,promo}/*.mc'));

    expect(result.files).toHaveLength(2);
    const dirs = result.files.map((f) => path.basename(path.dirname(f)));
    expect(dirs).toContain('news');
    expect(dirs).toContain('promo');
  });

  it('resolves [abc] character class pattern', () => {
    createFile('mail1.mc');
    createFile('mail2.mc');
    createFile('mail3.mc');
    createFile('mailX.mc'); // X not in [1-3] — should not match

    const result = resolveGlob(path.join(tmpDir, 'mail[1-3].mc'));

    expect(result.files).toHaveLength(3);
    const basenames = result.files.map((f) => path.basename(f));
    expect(basenames).toContain('mail1.mc');
    expect(basenames).toContain('mail2.mc');
    expect(basenames).toContain('mail3.mc');
    expect(basenames).not.toContain('mailX.mc');
  });

  it('returns empty array when base dir does not exist', () => {
    const result = resolveGlob(path.join(tmpDir, 'nonexistent', '*.mc'));
    expect(result.files).toEqual([]);
  });

  it('returns empty array when no files match', () => {
    createFile('email.txt');
    const result = resolveGlob(path.join(tmpDir, '*.mc'));
    expect(result.files).toEqual([]);
  });

  it('returns sorted file paths', () => {
    createFile('c.mc');
    createFile('a.mc');
    createFile('b.mc');

    const result = resolveGlob(path.join(tmpDir, '*.mc'));

    const basenames = result.files.map((f) => path.basename(f));
    expect(basenames).toEqual(['a.mc', 'b.mc', 'c.mc']);
  });

  it('preserves the relative structure info via baseDir', () => {
    createFile('src/mail001/index.mc');
    createFile('src/mail002/index.mc');

    const result = resolveGlob(path.join(tmpDir, 'src/**/*.mc'));

    expect(result.baseDir).toBe(path.join(tmpDir, 'src'));
    const relatives = result.files.map((f) => path.relative(result.baseDir, f));
    expect(relatives).toContain(path.join('mail001', 'index.mc'));
    expect(relatives).toContain(path.join('mail002', 'index.mc'));
  });

  it('skips node_modules and hidden directories', () => {
    createFile('src/email.mc');
    createFile('node_modules/pkg/email.mc');
    createFile('.git/hooks/email.mc');

    const result = resolveGlob(path.join(tmpDir, '**/*.mc'));

    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toContain('src');
  });

  it('matches the exact MJML #2502 scenario — per-campaign index files', () => {
    createFile('src/mail001/index.mc', `<mc>
  <mc-body></mc-body>
</mc>`);
    createFile('src/mail001/partial.mc', '');
    createFile('src/mail002/index.mc', `<mc>
  <mc-body></mc-body>
</mc>`);
    createFile('src/mail002/partial1.mc', '');

    const result = resolveGlob(path.join(tmpDir, 'src/*/index.mc'));

    expect(result.files).toHaveLength(2);
    expect(result.baseDir).toBe(path.join(tmpDir, 'src'));
    const relatives = result.files.map((f) => path.relative(result.baseDir, f));
    expect(relatives).toContain(path.join('mail001', 'index.mc'));
    expect(relatives).toContain(path.join('mail002', 'index.mc'));
  });
});
