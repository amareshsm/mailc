/**
 * Reproduces what Cursor sent: a welcome email with CSS-property attributes
 * (font-size=, background-color=, padding=). Compiles WITHOUT specifying
 * templateStyle, so it should use whatever the default is.
 *
 * If default is 'attribute' (post-flip): zero errors.
 * If default is 'class' (stale build):  6+ CSS_ATTR_IN_CLASS_MODE errors.
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
      const { resolve } = pending.get(msg.id)
      pending.delete(msg.id)
      resolve(msg)
    }
  }
})

const SOURCE = `<mc>
  <mc-head>
    <mc-title>Welcome</mc-title>
    <mc-preview>Thanks for signing up — let's get you started.</mc-preview>
  </mc-head>
  <mc-body>
    <mc-section padding="24px">
      <mc-column>
        <mc-text font-size="24px" font-weight="bold" align="center">
          Welcome aboard!
        </mc-text>
        <mc-text font-size="16px" align="center" padding="12px 0">
          We're glad to have you. Click below to get started.
        </mc-text>
        <mc-button href="https://example.com/get-started" background-color="#0066cc" color="#ffffff" border-radius="4px" align="center">
          Get Started
        </mc-button>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`

await send('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'verify', version: '0' },
})
proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n')

// Compile with NO templateStyle — relying on the default
const r = await send('tools/call', {
  name: 'compile_email',
  arguments: { source: SOURCE },
})
const result = JSON.parse(r.result.content[0].text)

console.log('compile_email (no templateStyle, relying on default):')
console.log('  errors:  ', result.errors.length)
console.log('  warnings:', result.warnings.length)
console.log('  partial: ', result.partial)
console.log('  html bytes:', result.html?.length ?? 0)
if (result.errors.length > 0) {
  console.log('\n  first 3 error codes:')
  result.errors.slice(0, 3).forEach((e) => console.log('   -', e.code, '—', e.message.slice(0, 100)))
}
console.log()
if (result.errors.length === 0 && result.html && result.html.length > 1000) {
  console.log('✓ DEFAULT IS NOW ATTRIBUTE — Cursor\'s exact email compiles without templateStyle override')
} else {
  console.log('✗ Default still bans CSS-prop attrs — server is stale or not picking up new mailc build')
}

proc.kill()
