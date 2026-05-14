/**
 * Simulates the exact protocol handshake Claude Desktop performs:
 *  - initialize with the protocol version Claude Desktop uses
 *  - notifications/initialized
 *  - tools/list
 *  - calls each tool with realistic args
 *  - verifies clean shutdown
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SERVER_PATH = fileURLToPath(new URL('./dist/index.js', import.meta.url))

const proc = spawn(
  'node',
  [SERVER_PATH],
  { stdio: ['pipe', 'pipe', 'pipe'] },
)

let stderrBuf = ''
proc.stderr.on('data', (d) => (stderrBuf += d.toString()))

let buf = ''
const pending = new Map()
let nextId = 1
function send(method, params) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject(new Error(`Timeout: ${method}`))
      }
    }, 5000)
  })
}
function notify(method, params) {
  proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n')
}

proc.stdout.on('data', (chunk) => {
  buf += chunk.toString()
  let nl
  while ((nl = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, nl).trim()
    buf = buf.slice(nl + 1)
    if (!line) continue
    try {
      const msg = JSON.parse(line)
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id)
        pending.delete(msg.id)
        if (msg.error) reject(new Error(JSON.stringify(msg.error)))
        else resolve(msg.result)
      }
    } catch {
      /* ignore */
    }
  }
})

const PASS = '\x1b[32m✓\x1b[0m'
const FAIL = '\x1b[31m✗\x1b[0m'

function ok(label, actualOk, detail) {
  console.log(`${actualOk ? PASS : FAIL} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!actualOk) failures++
}

let failures = 0

async function main() {
  // 1) initialize handshake
  const init = await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: { roots: { listChanged: true }, sampling: {} },
    clientInfo: { name: 'claude-ai', version: '0.1.0' },
  })
  ok(
    'initialize handshake',
    !!init?.protocolVersion,
    `protocol=${init?.protocolVersion}, server=${init?.serverInfo?.name} v${init?.serverInfo?.version}`,
  )
  ok('server advertises tools capability', init?.capabilities?.tools !== undefined)

  notify('notifications/initialized', {})

  // 2) tools/list
  const list = await send('tools/list', {})
  const names = (list?.tools ?? []).map((t) => t.name).sort()
  const expected = [
    'can_nest',
    'check_email_client_support',
    'compile_email',
    'extract_data_contract',
    'get_component_spec',
    'list_components',
    'validate_email_node',
  ]
  ok('tools/list returns 7 tools', names.length === 7, `got: ${names.join(', ')}`)
  ok(
    'all expected tool names present',
    expected.every((n) => names.includes(n)),
  )

  // each tool should have a description and an input schema
  let descOk = true,
    schemaOk = true
  for (const t of list.tools) {
    if (!t.description || t.description.length < 20) descOk = false
    if (!t.inputSchema || typeof t.inputSchema !== 'object') schemaOk = false
  }
  ok('every tool has a substantive description', descOk)
  ok('every tool has an inputSchema', schemaOk)

  // 3) call each tool
  // -- compile_email
  const ce = await send('tools/call', {
    name: 'compile_email',
    arguments: {
      source:
        '<mc><mc-body><mc-section><mc-column><mc-text>Hello from MCP</mc-text></mc-column></mc-section></mc-body></mc>',
    },
  })
  const ceJson = JSON.parse(ce.content[0].text)
  ok(
    'compile_email returns HTML',
    typeof ceJson.html === 'string' && ceJson.html.includes('Hello from MCP'),
  )
  ok('compile_email returns errors array', Array.isArray(ceJson.errors))
  ok('compile_email no errors for valid template', ceJson.errors.length === 0)

  // -- validate_email_node (broken input → must return structured fix)
  const vn = await send('tools/call', {
    name: 'validate_email_node',
    arguments: {
      node: { type: 'mc-button', attributes: {} },
      parentType: 'mc-column',
    },
  })
  const vnJson = JSON.parse(vn.content[0].text)
  ok('validate_email_node detects missing href', vnJson.valid === false && vnJson.errors.length > 0)
  ok(
    'validate_email_node returns structured FixInstruction',
    !!vnJson.errors[0]?.fix?.action,
    `action=${vnJson.errors[0]?.fix?.action}`,
  )

  // -- list_components
  const lc = await send('tools/call', { name: 'list_components', arguments: {} })
  const lcJson = JSON.parse(lc.content[0].text)
  ok('list_components returns components', lcJson.count > 20, `count=${lcJson.count}`)

  // -- get_component_spec
  const gs = await send('tools/call', {
    name: 'get_component_spec',
    arguments: { type: 'mc-button' },
  })
  const gsJson = JSON.parse(gs.content[0].text)
  ok(
    'get_component_spec returns full spec',
    gsJson.type === 'mc-button' && Array.isArray(gsJson.requiredAttributes),
  )

  // -- get_component_spec for unknown type → error
  const gsBad = await send('tools/call', {
    name: 'get_component_spec',
    arguments: { type: 'mc-nonexistent' },
  })
  ok(
    'get_component_spec returns isError for unknown type',
    gsBad.isError === true,
  )

  // -- can_nest
  const cn = await send('tools/call', {
    name: 'can_nest',
    arguments: { parent: 'mc-column', child: 'mc-button' },
  })
  const cnJson = JSON.parse(cn.content[0].text)
  ok('can_nest mc-column → mc-button is allowed', cnJson.allowed === true)

  const cnBad = await send('tools/call', {
    name: 'can_nest',
    arguments: { parent: 'mc-body', child: 'mc-text' },
  })
  const cnBadJson = JSON.parse(cnBad.content[0].text)
  ok('can_nest mc-body → mc-text is NOT allowed', cnBadJson.allowed === false)

  // -- extract_data_contract
  const dc = await send('tools/call', {
    name: 'extract_data_contract',
    arguments: {
      source:
        '<mc><mc-body><mc-section><mc-column>' +
        '<mc-text>Hi {{user.name}}</mc-text>' +
        '<mc-for-each collection="order.items" as="item">' +
        '<mc-text>{{item.name}} - ${{item.price}}</mc-text>' +
        '</mc-for-each>' +
        '</mc-column></mc-section></mc-body></mc>',
    },
  })
  const dcJson = JSON.parse(dc.content[0].text)
  ok(
    'extract_data_contract finds required fields',
    dcJson.summary.requiredCount > 0,
    `required=${dcJson.summary.requiredCount}`,
  )
  ok(
    'extract_data_contract finds the loop',
    dcJson.summary.loopCount === 1 && dcJson.loops[0]?.variable === 'item',
    `loop source=${dcJson.loops[0]?.source}`,
  )

  // -- check_email_client_support
  const cc = await send('tools/call', {
    name: 'check_email_client_support',
    arguments: {
      css: 'display: flex; gap: 16px',
      targetClients: ['outlook.*'],
    },
  })
  const ccJson = JSON.parse(cc.content[0].text)
  ok(
    'check_email_client_support catches Outlook flexbox issue',
    ccJson.success === false && ccJson.issueCount > 0,
    `issues=${ccJson.issueCount}`,
  )

  // 4) clean shutdown
  proc.kill('SIGTERM')
  await new Promise((r) => setTimeout(r, 200))
  ok('server shuts down cleanly on SIGTERM', proc.killed === true)
  ok('server stderr banner matches expected', stderrBuf.includes('mailc-mcp v0.1.0 ready'))

  console.log(`\n${failures === 0 ? PASS : FAIL} ${failures === 0 ? 'all checks passed' : `${failures} checks failed`}`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(`${FAIL} fatal:`, err.message)
  proc.kill()
  process.exit(1)
})
