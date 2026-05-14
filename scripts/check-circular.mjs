#!/usr/bin/env node
/**
 * check-circular.mjs — Circular dependency gate for CI.
 *
 * The mailc compiler uses a recursive-descent pattern where:
 *   compiler/index.ts (exports compileNode)
 *     → compiler/registry.ts (imports all component compilers)
 *       → compiler/components/*.ts (each calls compileNode to recurse children)
 *         → compiler/index.ts  ← intentional circular
 *
 * This creates N circulars (one per component) that are structurally
 * required and safe — JavaScript resolves them correctly at runtime because
 * compileNode is defined before any component compiler calls it.
 *
 * This script:
 *   1. Runs madge on src/index.ts
 *   2. Strips the known-intentional compiler circulars
 *   3. Fails with exit code 1 if ANY unexpected circulars remain
 *
 * To add a new intentional circular, add its pattern to KNOWN_PATTERNS below
 * with a comment explaining WHY it exists.
 */

import { execSync } from 'node:child_process';

// Patterns for KNOWN/INTENTIONAL circulars. Each string is matched against
// the madge circular output line. A circular is "known" if its text contains
// ANY of these substrings.
const KNOWN_PATTERNS = [
  // Recursive descent: every component compiler calls compileNode() to recurse.
  // Safe — JS module system resolves this correctly at runtime.
  'compiler/index.ts > compiler/registry.ts > compiler/components/',
];

function main() {
  let output;
  try {
    execSync(
      'pnpm exec madge src/index.ts --extensions ts --ts-config tsconfig.json --circular',
      { stdio: 'pipe' }
    );
    // madge exits 0 → no circulars at all
    console.log('✓ No circular dependencies found.');
    process.exit(0);
  } catch (err) {
    // madge exits 1 when circulars are found — output is in stderr+stdout
    output = (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? '');
  }

  // Parse the numbered list from madge output
  const lines = output.split('\n');
  const circularLines = lines.filter(l => /^\s*\d+\)/.test(l));

  const unexpected = circularLines.filter(line => {
    return !KNOWN_PATTERNS.some(pattern => line.includes(pattern));
  });

  if (unexpected.length === 0) {
    const known = circularLines.length;
    console.log(
      `✓ ${known} known intentional circular(s) (recursive-descent compiler pattern) — all accounted for.`
    );
    console.log('✓ No unexpected circular dependencies.');
    process.exit(0);
  }

  console.error(`❌ Found ${unexpected.length} UNEXPECTED circular dependenc${unexpected.length === 1 ? 'y' : 'ies'}:`);
  unexpected.forEach(l => console.error(' ', l.trim()));
  console.error('');
  console.error('To fix: restructure the import to break the cycle.');
  console.error('If this circular is intentional, add its pattern to KNOWN_PATTERNS in scripts/check-circular.mjs');
  process.exit(1);
}

main();
