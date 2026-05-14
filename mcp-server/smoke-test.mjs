/**
 * Smoke test: spawn mailc-mcp, list tools, then call compile_email and
 * list_components. Verifies the server boots, registers tools, and handles
 * tool calls end-to-end.
 *
 * Usage: node smoke-test.mjs
 */

import { spawn } from 'node:child_process'

const proc = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
})

let buffer = ''
const responses = new Map()
let nextId = 1

proc.stdout.on('data', (chunk) => {
  buffer += chunk.toString()
  let nl
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim()
    buffer = buffer.slice(nl + 1)
    if (!line) continue
    try {
      const msg = JSON.parse(line)
      if (msg.id && responses.has(msg.id)) {
        responses.get(msg.id)(msg)
        responses.delete(msg.id)
      }
    } catch {
      // ignore non-JSON
    }
  }
})

function send(method, params) {
  const id = nextId++
  return new Promise((resolve) => {
    responses.set(id, resolve)
    proc.stdin.write(
      JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n',
    )
  })
}

async function main() {
  // 1. initialize
  await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'smoke-test', version: '0' },
  })
  proc.stdin.write(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }) + '\n',
  )

  // 2. list tools
  const list = await send('tools/list', {})
  const toolNames = (list.result?.tools ?? []).map((t) => t.name)
  console.log('[tools/list]', toolNames.length, 'tools:', toolNames.join(', '))

  // 3. call list_components
  const lc = await send('tools/call', {
    name: 'list_components',
    arguments: {},
  })
  const lcParsed = JSON.parse(lc.result.content[0].text)
  console.log('[list_components]', lcParsed.count, 'components registered')

  // 4. call compile_email with a tiny template
  const ce = await send('tools/call', {
    name: 'compile_email',
    arguments: {
      source:
        '<mc><mc-body><mc-section><mc-column><mc-text>Hello mailc-mcp</mc-text></mc-column></mc-section></mc-body></mc>',
    },
  })
  const ceParsed = JSON.parse(ce.result.content[0].text)
  console.log(
    '[compile_email]',
    'errors:', ceParsed.errors.length,
    'warnings:', ceParsed.warnings.length,
    'html bytes:', ceParsed.html?.length ?? 0,
  )

  // 5. call validate_email_node — known-bad input
  const vn = await send('tools/call', {
    name: 'validate_email_node',
    arguments: {
      node: { type: 'mc-button', attributes: {} }, // missing href
      parentType: 'mc-column',
    },
  })
  const vnParsed = JSON.parse(vn.result.content[0].text)
  console.log(
    '[validate_email_node]',
    'valid:', vnParsed.valid,
    'errors:', vnParsed.errors.length,
    'first fix action:', vnParsed.errors[0]?.fix?.action,
  )

  // 6. call extract_data_contract
  const dc = await send('tools/call', {
    name: 'extract_data_contract',
    arguments: {
      source:
        '<mc><mc-body><mc-section><mc-column><mc-text>Hi {{user.name}}</mc-text><mc-if condition="user.isPro"><mc-text>Welcome Pro {{user.email}}</mc-text></mc-if></mc-column></mc-section></mc-body></mc>',
    },
  })
  const dcParsed = JSON.parse(dc.result.content[0].text)
  console.log(
    '[extract_data_contract]',
    'required:', dcParsed.summary.requiredCount,
    'optional:', dcParsed.summary.optionalCount,
    'loops:', dcParsed.summary.loopCount,
  )

  // 7. call check_email_client_support
  const cc = await send('tools/call', {
    name: 'check_email_client_support',
    arguments: {
      css: 'display: flex; gap: 16px; background-color: #fff',
      targetClients: ['gmail.*', 'outlook.*'],
    },
  })
  const ccParsed = JSON.parse(cc.result.content[0].text)
  console.log(
    '[check_email_client_support]',
    'success:', ccParsed.success,
    'issues:', ccParsed.issueCount,
  )

  proc.kill()
}

main().catch((err) => {
  console.error('smoke test failed:', err)
  proc.kill()
  process.exit(1)
})
