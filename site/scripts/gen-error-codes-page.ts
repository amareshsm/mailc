/**
 * gen-error-codes-page.ts
 *
 * Reads the canonical `ErrorCode` enum from `src/errors/codes.ts` and emits
 * `content/docs/api/error-codes.mdx` listing every code grouped by pipeline
 * stage. Group headings are taken from the section comments in the enum.
 *
 * Run: pnpm gen:error-codes
 *
 * Re-run whenever a new code is added to the enum. Output is committed.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO_ROOT = join(__dirname, '..', '..')
const SOURCE = join(REPO_ROOT, 'src', 'errors', 'codes.ts')
const OUT = join(__dirname, '..', 'content', 'docs', 'api', 'error-codes.mdx')

interface CodeEntry {
  group: string
  code: string
}

function parse(source: string): CodeEntry[] {
  const lines = source.split('\n')
  let currentGroup = 'Misc'
  const out: CodeEntry[] = []

  // Lines like:  // ── Tokenizer ────…
  // and:         UNCLOSED_TAG = 'UNCLOSED_TAG',
  for (const line of lines) {
    const groupMatch = line.match(/^\s*\/\/\s*(?:─\s*)?(.+?)(?:\s*─*\s*)?$/)
    if (groupMatch && /[A-Za-z]/.test(groupMatch[1] ?? '')) {
      // Strip leading/trailing box-drawing chars and stray dashes.
      const candidate = (groupMatch[1] ?? '')
        .replace(/^[─\s-]+|[─\s-]+$/g, '')
        .trim()
      // Only treat top-of-section comments as groups — they tend to be 1–4 words.
      // Skip generic file-level comments.
      if (
        candidate.length > 0 &&
        candidate.length < 40 &&
        !candidate.startsWith('All ') &&
        !candidate.startsWith('Convention') &&
        !candidate.includes('mailc compiler')
      ) {
        currentGroup = candidate
      }
      continue
    }
    const codeMatch = line.match(/^\s*([A-Z][A-Z0-9_]+)\s*=\s*'[A-Z0-9_]+'\s*,?/)
    if (codeMatch) {
      out.push({ group: currentGroup, code: codeMatch[1] ?? '' })
    }
  }

  return out
}

function generate(entries: CodeEntry[]): string {
  // Group by stage, preserve insertion order.
  const groups: { group: string; codes: string[] }[] = []
  const groupIndex = new Map<string, number>()
  for (const e of entries) {
    let i = groupIndex.get(e.group)
    if (i === undefined) {
      i = groups.length
      groupIndex.set(e.group, i)
      groups.push({ group: e.group, codes: [] })
    }
    groups[i]!.codes.push(e.code)
  }

  const sections: string[] = []
  sections.push(`---
title: Error codes
description: Every machine-readable code that can appear in result.errors / result.warnings, grouped by pipeline stage.
---

Every issue mailc reports comes with a stable, machine-readable \`code\`. You can match on these in CI, lint scripts, or builder tooling — codes never change without a major-version bump.

\`\`\`ts
const result = compile(source)
for (const issue of result.errors) {
  if (issue.code === 'INVALID_NESTING') {
    // ...
  }
}
\`\`\`

Codes are grouped by the compile-pipeline stage that emits them. Same group = same kind of problem.
`)

  for (const { group, codes } of groups) {
    sections.push(`## ${group}\n`)
    sections.push('| Code | Severity |')
    sections.push('|---|---|')
    for (const c of codes) {
      const severity = inferSeverity(c, group)
      sections.push(`| \`${c}\` | ${severity} |`)
    }
    sections.push('')
  }

  sections.push(`## Reading an issue

Every entry in \`result.errors\` and \`result.warnings\` follows this shape:

\`\`\`ts
interface MCIssue {
  code: string                   // one of the values above
  message: string                // human-readable detail
  severity: 'error' | 'warning' | 'info'
  loc?: { line: number; col: number; file?: string }
  fix?: string                   // suggested fix when known
}
\`\`\`

For programmatic handling, switch on \`code\`. For surfacing to humans, \`message\` is already formatted.`)

  return sections.join('\n') + '\n'
}

/**
 * Best-effort severity guess based on the group + code name.
 * Hand-written explanations can override this in a later pass.
 */
function inferSeverity(code: string, group: string): string {
  // Per-code overrides (rare). Add codes here whose severity doesn't match
  // the group default — keeps the bulk of the table machine-inferred.
  if (code === 'STRICT_MODE_MCSTYLE_BYPASS') return 'info'

  const lower = group.toLowerCase()
  if (lower.includes('accessibility')) return 'warning'
  if (lower.includes('budget')) return 'warning'
  if (lower.includes('css pipeline') && code !== 'BREAKING_CSS') return 'warning'
  if (lower.includes('compile mode')) return 'warning'
  if (code === 'NO_EFFECT_CSS' || code === 'IMPORTANT_NOT_SUPPORTED') return 'warning'
  if (code === 'VARIABLE_SHADOWING' || code === 'UNDEFINED_VARIABLE') return 'warning'
  return 'error'
}

// ─── Main ──────────────────────────────────────────────────────────────────
const source = readFileSync(SOURCE, 'utf8')
const entries = parse(source)
if (entries.length === 0) {
  console.error('No error codes parsed from src/errors/codes.ts')
  process.exit(1)
}
writeFileSync(OUT, generate(entries), 'utf8')
console.log(`Wrote ${entries.length} error codes to content/docs/api/error-codes.mdx`)
