#!/usr/bin/env node
/**
 * mailc-mcp — Model Context Protocol server for the mailc email framework.
 *
 * Exposes mailc's compile, validate, introspect, and caniemail capabilities
 * as MCP tools so AI agents (Claude Desktop, Cursor, Mastra, LangGraph, etc.)
 * can author and verify email templates with structured feedback.
 *
 * Transport: stdio. Run via `npx mailc-mcp` or as a Claude Desktop MCP server.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import {
  compileEmailInput,
  compileEmailHandler,
} from './tools/compile.js'
import {
  validateNodeInput,
  validateNodeHandler,
} from './tools/validate.js'
import {
  listComponentsInput,
  listComponentsHandler,
  getComponentSpecInput,
  getComponentSpecHandler,
  canNestInput,
  canNestHandler,
} from './tools/components.js'
import {
  extractDataContractInput,
  extractDataContractHandler,
} from './tools/data-contract.js'
import {
  checkEmailClientSupportInput,
  checkEmailClientSupportHandler,
} from './tools/compat.js'

// ---------------------------------------------------------------------------
// JSON content helper — every tool returns its result as a single JSON
// content block. Keeps the wire shape predictable for AI consumers.
// ---------------------------------------------------------------------------

type ToolResult = {
  content: { type: 'text'; text: string }[]
  isError?: boolean
}

function asJson(value: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  }
}

function asError(err: unknown): ToolResult {
  const message = err instanceof Error ? err.message : String(err)
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  }
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const server = new McpServer({
    name: 'mailc-mcp',
    version: '0.1.0',
  })

  // ── compile_email ─────────────────────────────────────────────────────
  server.registerTool(
    'compile_email',
    {
      title: 'Compile email template',
      description:
        'Render mailc markup or a JSON IR tree to email-safe HTML. Returns the HTML, structured errors/warnings, and a partial flag. Use this to verify generated templates compile cleanly before shipping.',
      inputSchema: compileEmailInput,
    },
    async (args) => {
      try {
        return asJson(await compileEmailHandler(args))
      } catch (err) {
        return asError(err)
      }
    },
  )

  // ── validate_email_node ──────────────────────────────────────────────
  server.registerTool(
    'validate_email_node',
    {
      title: 'Validate a JSON IR node',
      description:
        'Pre-flight check for a single mailc JSON node against its parent context. Returns structured FixInstruction objects (action, attribute, classHint, confidence) so an agent can self-correct without parsing prose error messages.',
      inputSchema: validateNodeInput,
    },
    async (args) => {
      try {
        return asJson(await validateNodeHandler(args))
      } catch (err) {
        return asError(err)
      }
    },
  )

  // ── list_components ───────────────────────────────────────────────────
  server.registerTool(
    'list_components',
    {
      title: 'List all built-in mailc components',
      description:
        'Returns every built-in mc-* component the compiler ships with. Each entry includes type, category, and description. Plugins are per-call values in the mailc API (compile(src, { plugins })) and are not enumerated here — fetch their metadata from the plugin author\'s package.',
      inputSchema: listComponentsInput,
    },
    async () => {
      try {
        return asJson(await listComponentsHandler())
      } catch (err) {
        return asError(err)
      }
    },
  )

  // ── get_component_spec ───────────────────────────────────────────────
  server.registerTool(
    'get_component_spec',
    {
      title: 'Get full spec for a component',
      description:
        "Returns the full ComponentSpec for one type: attributes (required/optional/CSS-prop), allowed parents and children, what HTML it compiles to and why, a usage example, and common mistakes. Call this BEFORE generating a node so you don't hallucinate attributes.",
      inputSchema: getComponentSpecInput,
    },
    async (args) => {
      try {
        return asJson(await getComponentSpecHandler(args))
      } catch (err) {
        return asError(err)
      }
    },
  )

  // ── can_nest ──────────────────────────────────────────────────────────
  server.registerTool(
    'can_nest',
    {
      title: 'Check if a child can sit inside a parent',
      description:
        'Quick parent/child structural check. Returns { allowed: boolean }. Use to validate drop targets in builders, or to check structure before generating nested nodes.',
      inputSchema: canNestInput,
    },
    async (args) => {
      try {
        return asJson(await canNestHandler(args))
      } catch (err) {
        return asError(err)
      }
    },
  )

  // ── extract_data_contract ────────────────────────────────────────────
  server.registerTool(
    'extract_data_contract',
    {
      title: 'Extract template data contract',
      description:
        'Static analysis of a template. Returns: required fields (always accessed), optional fields (gated by mc-if), and per-loop iteration shapes (mc-each variable + source + per-item paths). Use this to know what data shape your template needs.',
      inputSchema: extractDataContractInput,
    },
    async (args) => {
      try {
        return asJson(await extractDataContractHandler(args))
      } catch (err) {
        return asError(err)
      }
    },
  )

  // ── check_email_client_support ───────────────────────────────────────
  server.registerTool(
    'check_email_client_support',
    {
      title: 'Check CSS against caniemail client support data',
      description:
        'Validates a CSS declaration string against per-client support (Gmail, Outlook, Apple Mail, etc.). Returns structured issues with affected clients, severity, and notes. Use BEFORE shipping to catch "this CSS will silently break in Outlook" issues.',
      inputSchema: checkEmailClientSupportInput,
    },
    async (args) => {
      try {
        return asJson(await checkEmailClientSupportHandler(args))
      } catch (err) {
        return asError(err)
      }
    },
  )

  // ── connect ──────────────────────────────────────────────────────────
  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Banner on stderr so users running it manually see something.
  // stdout is reserved for the MCP protocol — never log to it.
  process.stderr.write('mailc-mcp v0.1.0 ready (stdio)\n')
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.stack ?? err.message : String(err)
  process.stderr.write(`mailc-mcp fatal: ${message}\n`)
  process.exit(1)
})
