/**
 * Verifies the classHint shape fix end-to-end through the MCP server.
 *
 * Calls validate_email_node with a mc-button that has 3 CSS-prop attrs in
 * class mode. The returned FixInstructions must:
 *   - have classHint substituted with the actual attribute value (no '#value')
 *   - never contain English " or " prose in the canonical class
 *   - put alternatives in classHintAlternatives (when applicable)
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SERVER_PATH = fileURLToPath(new URL('./dist/index.js', import.meta.url))

const proc = spawn(
  'node',
  [SERVER_PATH],
  { stdio: ['pipe', 'pipe', 'inherit'] },
)

let buf = ''
const pending = new Map()
let nextId = 1
function send(method, params) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
  })
}
proc.stdout.on('data', (chunk) => {
  buf += chunk.toString()
  let nl
  while ((nl = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, nl).trim()
    buf = buf.slice(nl + 1)
    if (!line) continue
    const msg = JSON.parse(line)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).resolve(msg)
      pending.delete(msg.id)
    }
  }
})

await send('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'verify', version: '0' },
})
proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n')

// Multi-error scenario: button with 4 CSS-prop attrs in class mode
const r = await send('tools/call', {
  name: 'validate_email_node',
  arguments: {
    node: {
      type: 'mc-button',
      attributes: {
        href: 'https://example.com',
        color: '#ffffff',
        'background-color': '#0066cc',
        'font-size': '16px',
        'text-align': 'center',
      },
    },
    parentType: 'mc-column',
    templateStyle: 'class',
  },
})
const result = JSON.parse(r.result.content[0].text)

console.log('validate_email_node — multi-error class-mode scenario:')
console.log('  valid:    ', result.valid)
console.log('  errors:   ', result.errors.length)
console.log('  warnings: ', result.warnings.length)
console.log()

const PASS = '\x1b[32m✓\x1b[0m'
const FAIL = '\x1b[31m✗\x1b[0m'
let fails = 0

for (const w of result.warnings) {
  const f = w.fix
  if (!f || f.action !== 'replace-with-class') continue
  const hint = f.classHint ?? ''
  const alts = f.classHintAlternatives ?? []
  let ok = true
  let why = []
  if (hint.includes('#value')) { ok = false; why.push("'#value' literal not substituted") }
  if (/\bor\b/.test(hint))   { ok = false; why.push("'or' prose in canonical") }
  if (hint.includes('|'))    { ok = false; why.push("'|' prose in canonical") }
  console.log(
    `${ok ? PASS : FAIL} ${f.attribute.padEnd(18)} → classHint=${JSON.stringify(hint)}` +
      (alts.length ? `  alt=${JSON.stringify(alts)}` : '') +
      (ok ? '' : `  [${why.join(', ')}]`),
  )
  if (!ok) fails++
}

// Specific-value assertions
const map = Object.fromEntries(result.warnings.filter(w => w.fix?.attribute).map(w => [w.fix.attribute, w.fix]))
const assertions = [
  ['color',            'text-[#ffffff]'],
  ['background-color', 'bg-[#0066cc]'],
  ['font-size',        'text-[16px]'],
  ['text-align',       'text-center'],
]
console.log()
for (const [attr, expected] of assertions) {
  const got = map[attr]?.classHint
  const ok = got === expected
  console.log(`${ok ? PASS : FAIL} ${attr.padEnd(18)} expected=${JSON.stringify(expected)} got=${JSON.stringify(got)}`)
  if (!ok) fails++
}

console.log()
console.log(fails === 0 ? `${PASS} all classHint assertions passed` : `${FAIL} ${fails} failures`)

proc.kill()
process.exit(fails === 0 ? 0 : 1)
