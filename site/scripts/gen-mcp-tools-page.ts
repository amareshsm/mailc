/**
 * gen-mcp-tools-page.ts
 *
 * Reads `mcp-server/src/index.ts` for `server.registerTool(...)` calls and
 * each per-tool input schema in `mcp-server/src/tools/*.ts`, then emits
 * `content/docs/api/mcp-server.mdx` documenting every tool an AI agent can
 * call.
 *
 * Run: pnpm gen:mcp-tools
 *
 * Re-run when tools are added/changed. Output is committed.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const REPO_ROOT = join(__dirname, '..', '..')
const MCP_INDEX = join(REPO_ROOT, 'mcp-server', 'src', 'index.ts')
const MCP_TOOLS_DIR = join(REPO_ROOT, 'mcp-server', 'src', 'tools')
const OUT = join(__dirname, '..', 'content', 'docs', 'api', 'mcp-server.mdx')

interface Tool {
  name: string
  title: string
  description: string
  inputSchemaName: string
  parameters: Parameter[]
}

interface Parameter {
  name: string
  type: string
  optional: boolean
  description: string
}

// ─── Parse tool registrations from index.ts ──────────────────────────────
function parseTools(indexSource: string): Omit<Tool, 'parameters'>[] {
  const out: Omit<Tool, 'parameters'>[] = []
  // Match: server.registerTool('NAME', { title: '...', description: '...', inputSchema: NAME_INPUT, ... }
  const pattern =
    /server\.registerTool\(\s*'([^']+)'\s*,\s*\{\s*title:\s*'([^']+)'\s*,\s*description:\s*'([^']+(?:'\s*\+\s*'[^']+)*)'\s*,\s*inputSchema:\s*(\w+)/g
  let m
  while ((m = pattern.exec(indexSource)) !== null) {
    out.push({
      name: m[1] ?? '',
      title: m[2] ?? '',
      description: (m[3] ?? '').replace(/'\s*\+\s*'/g, ''),
      inputSchemaName: m[4] ?? '',
    })
  }
  return out
}

// ─── Parse input schema parameters from a tools/*.ts file ────────────────
// We do regex-level parsing — zod schemas at the top level usually look like:
//   export const xyzInput = {
//     paramName: z.<chain>().describe('...'),
//     ...
//   }
// We extract the top-level keys, their type (best-effort), optional flag, and description.
function parseInputSchema(toolFiles: string[], schemaName: string): Parameter[] {
  for (const file of toolFiles) {
    const source = readFileSync(file, 'utf8')
    const startRe = new RegExp(`export const ${schemaName}\\s*=\\s*\\{`)
    const startMatch = source.match(startRe)
    if (!startMatch || startMatch.index === undefined) continue

    // Find matching closing brace
    let depth = 0
    const startIdx = source.indexOf('{', startMatch.index)
    let endIdx = -1
    for (let i = startIdx; i < source.length; i++) {
      if (source[i] === '{') depth++
      else if (source[i] === '}') {
        depth--
        if (depth === 0) {
          endIdx = i
          break
        }
      }
    }
    if (endIdx === -1) continue

    const body = source.slice(startIdx + 1, endIdx)
    // Empty input? `export const listComponentsInput = {}`
    if (!body.trim()) return []

    return parseParams(body)
  }
  return []
}

function parseParams(body: string): Parameter[] {
  // Walk the body character by character, tracking brace/paren/bracket depth.
  // At depth 0, any `\n<indent><name>:` is a top-level key. We capture from
  // there to the next top-level key (or end of body) — that's the value.
  // Robust against multi-line z chains, nested z.object({...}), and z.enum([...]).
  const keys: { name: string; start: number }[] = []
  let depth = 0
  let inString: false | "'" | '"' | '`' = false

  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    const prev = body[i - 1]
    if (inString) {
      if (ch === inString && prev !== '\\') inString = false
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch
      continue
    }
    if (ch === '{' || ch === '(' || ch === '[') depth++
    else if (ch === '}' || ch === ')' || ch === ']') depth--
    else if (depth === 0 && ch === '\n') {
      // Look for a top-level key on the next line
      const rest = body.slice(i + 1)
      const m = rest.match(/^(\s*)(\w+):/)
      if (m) {
        keys.push({ name: m[2] ?? '', start: i + 1 + (m[1]?.length ?? 0) })
      }
    }
  }

  const params: Parameter[] = []
  for (let k = 0; k < keys.length; k++) {
    const { name, start } = keys[k]!
    const end = k + 1 < keys.length ? keys[k + 1]!.start : body.length
    const chain = body.slice(start + name.length + 1, end) // skip "name:"

    // Type
    const typeMatch = chain.match(/z\s*\.\s*(\w+)/)
    let type = typeMatch?.[1] ?? 'unknown'
    if (type === 'enum') {
      const valuesMatch = chain.match(/\.enum\s*\(\s*\[([^\]]+)\]/)
      if (valuesMatch) {
        type = valuesMatch[1]!
          .split(',')
          .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
          .map((s) => `'${s}'`)
          .join(' \\| ')
      }
    }

    const optional = /\.optional\s*\(/.test(chain)

    // Description — last .describe('...') wins. The argument may span
    // multiple lines and use single, double, or backtick quotes.
    const descMatches = [
      ...chain.matchAll(/\.describe\s*\(\s*(['"`])([\s\S]*?)\1\s*,?\s*\)/g),
    ]
    const description =
      descMatches.length > 0
        ? (descMatches[descMatches.length - 1]?.[2] ?? '')
            .replace(/\\'/g, "'")
            .replace(/\\"/g, '"')
            .replace(/\s+/g, ' ')
            .trim()
        : ''

    params.push({ name, type, optional, description })
  }
  return params
}

/**
 * Escape characters MDX would otherwise parse — `{` / `}` (JSX expressions),
 * angle brackets in inline tag-like sequences, and pipe characters in tables.
 */
function escapeMdx(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
}

function escapeTableCell(s: string): string {
  return escapeMdx(s).replace(/\|/g, '\\|')
}

// ─── Render to MDX ────────────────────────────────────────────────────────
function render(tools: Tool[]): string {
  const sections: string[] = []

  sections.push(`---
title: MCP server
description: Tools the mailc MCP server exposes to AI agents (Claude Desktop, Cursor, Mastra, LangGraph, …).
---

The \`mailc-mcp\` package is a [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI agents author, validate, and inspect mailc templates with structured feedback.

## Install + run

\`\`\`bash
npm install -g mailc-mcp
mailc-mcp                # stdio transport — AI clients spawn it on demand
\`\`\`

For Claude Desktop, add to your \`claude_desktop_config.json\`:

\`\`\`json
{
  "mcpServers": {
    "mailc": {
      "command": "npx",
      "args": ["-y", "mailc-mcp"]
    }
  }
}
\`\`\`

## Tools

The server exposes ${tools.length} tools. Every tool returns its result as a JSON content block — the wire shape stays predictable for AI consumers.
`)

  for (const t of tools) {
    sections.push(`### \`${t.name}\``)
    sections.push(`**${escapeMdx(t.title)}**\n`)
    sections.push(escapeMdx(t.description) + '\n')

    if (t.parameters.length === 0) {
      sections.push('_No parameters._\n')
    } else {
      sections.push('| Parameter | Type | Required | Description |')
      sections.push('|---|---|---|---|')
      for (const p of t.parameters) {
        const req = p.optional ? 'no' : 'yes'
        sections.push(
          `| \`${p.name}\` | \`${p.type}\` | ${req} | ${escapeTableCell(p.description)} |`,
        )
      }
      sections.push('')
    }
  }

  sections.push(`## Errors

Tools return \`{ "error": "<message>" }\` with \`isError: true\` on failure. AI agents should fall back to retry or to a different tool. Common failures:

- Invalid markup or JSON IR — retry with corrected input
- Unknown component type — call \`list_components\` first to confirm the registry
- Unknown email-client glob in \`check_email_client_support\` — call without args to list valid clients

## Source

The MCP server lives in [\`mcp-server/\`](https://github.com/anthropics/mailc/tree/main/mcp-server). Tool implementations are in [\`mcp-server/src/tools/\`](https://github.com/anthropics/mailc/tree/main/mcp-server/src/tools). PRs welcome.`)

  return sections.join('\n') + '\n'
}

// ─── Main ──────────────────────────────────────────────────────────────────
const indexSource = readFileSync(MCP_INDEX, 'utf8')
const toolFiles = readdirSync(MCP_TOOLS_DIR)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => join(MCP_TOOLS_DIR, f))

const stubs = parseTools(indexSource)
if (stubs.length === 0) {
  console.error('No registerTool() calls parsed from mcp-server/src/index.ts')
  process.exit(1)
}

const tools: Tool[] = stubs.map((t) => ({
  ...t,
  parameters: parseInputSchema(toolFiles, t.inputSchemaName),
}))

writeFileSync(OUT, render(tools), 'utf8')
console.log(`Wrote ${tools.length} MCP tools to content/docs/api/mcp-server.mdx`)
for (const t of tools) {
  console.log(`  · ${t.name} (${t.parameters.length} params)`)
}
