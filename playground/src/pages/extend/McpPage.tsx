/**
 * Browser-side walkthrough of the mailc-mcp server. The stdio server can't
 * run in the browser, but each tool is a thin wrapper around mailc's public
 * API — so this page calls those APIs directly and renders the JSON exactly
 * as the real server would return it.
 */

import { useMemo, useState } from 'react'
import { Bot, Copy, CheckCircle2, AlertCircle, Sparkles, Terminal } from 'lucide-react'
import { CodeBlock } from '@/components/ui/code-block'
import {
  compile,
  introspect,
  checkCss,
  parse,
  tokenize,
} from 'mailc'
import { cn } from '@/lib/utils'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { RelatedLinks } from '@/components/layout/RelatedLinks'

// ─── Tool registry ──────────────────────────────────────────────────────

type ToolId =
  | 'compile_email'
  | 'validate_email_node'
  | 'list_components'
  | 'get_component_spec'
  | 'can_nest'
  | 'extract_data_contract'
  | 'check_email_client_support'

interface ToolDef {
  id: ToolId
  label: string
  blurb: string
  defaultInput: Record<string, unknown>
}

const TOOLS: ToolDef[] = [
  {
    id: 'compile_email',
    label: 'compile_email',
    blurb: 'Compile a .mc template (or JSON IR) to email-safe HTML.',
    defaultInput: {
      source: `<mc>
  <mc-body>
    <mc-section padding="24px">
      <mc-column>
        <mc-text font-size="24px" font-weight="bold">Welcome aboard!</mc-text>
        <mc-button href="https://example.com">Get Started</mc-button>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
    },
  },
  {
    id: 'validate_email_node',
    label: 'validate_email_node',
    blurb: 'Pre-flight validation of a single JSON IR node — returns FixInstructions.',
    defaultInput: {
      node: { type: 'mc-button', attributes: {} },
      parentType: 'mc-column',
    },
  },
  {
    id: 'list_components',
    label: 'list_components',
    blurb: 'List every registered component (built-ins + plugins).',
    defaultInput: {},
  },
  {
    id: 'get_component_spec',
    label: 'get_component_spec',
    blurb: 'Full metadata for one component — attributes, parents, examples.',
    defaultInput: { type: 'mc-button' },
  },
  {
    id: 'can_nest',
    label: 'can_nest',
    blurb: 'Can component X live inside component Y? Returns yes/no with reason.',
    defaultInput: { parent: 'mc-column', child: 'mc-button' },
  },
  {
    id: 'extract_data_contract',
    label: 'extract_data_contract',
    blurb: 'Walk a template and report every {{variable}} and loop source.',
    defaultInput: {
      source: `<mc>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Hi {{user.name}}</mc-text>
        <mc-for-each collection="order.items" as="item">
          <mc-text>{{item.name}} - {{item.price}}</mc-text>
        </mc-for-each>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
    },
  },
  {
    id: 'check_email_client_support',
    label: 'check_email_client_support',
    blurb: 'Run CSS through caniemail compatibility for given target clients.',
    defaultInput: {
      css: 'display: flex; gap: 16px',
      targetClients: ['gmail.*', 'outlook.*'],
    },
  },
]

// ─── Tool runners (call the same APIs the stdio server would) ───────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function runTool(id: ToolId, input: any): unknown {
  switch (id) {
    case 'compile_email': {
      const { html, errors, warnings, partial } = compile(input.source)
      return {
        html: html ?? null,
        errors,
        warnings,
        partial,
      }
    }
    case 'validate_email_node': {
      const result = introspect.validate(input.node, input.parentType ?? null, {
        templateStyle: input.templateStyle ?? 'attribute',
      })
      return result
    }
    case 'list_components': {
      const all = introspect.all()
      return { count: all.length, components: all.map((c) => c.type) }
    }
    case 'get_component_spec': {
      const spec = introspect.component(input.type)
      if (!spec) {
        return { error: `Unknown component "${input.type}"` }
      }
      return spec
    }
    case 'can_nest': {
      return introspect.canNest(input.parent, input.child)
    }
    case 'extract_data_contract': {
      const tokens = tokenize(input.source)
      const ast = parse(tokens)
      return introspect.dataContract(ast)
    }
    case 'check_email_client_support': {
      const r = checkCss(input.css, input.targetClients)
      return {
        success: r.success,
        targetClients: input.targetClients,
        issueCount: r.issues.length,
        issues: r.issues,
      }
    }
  }
}

// ─── Component ──────────────────────────────────────────────────────────

const CONFIG_SNIPPET = `{
  "mcpServers": {
    "mailc": {
      "command": "npx",
      "args": ["-y", "mailc-mcp"]
    }
  }
}`

export function McpPage(): JSX.Element {
  const [activeTool, setActiveTool] = useState<ToolId>('compile_email')
  const [inputJson, setInputJson] = useState<string>(
    JSON.stringify(TOOLS[0]?.defaultInput, null, 2)
  )
  const [configCopied, setConfigCopied] = useState(false)

  const tool = TOOLS.find((t) => t.id === activeTool)!

  const result = useMemo(() => {
    try {
      const parsed = JSON.parse(inputJson)
      const out = runTool(activeTool, parsed)
      return { ok: true as const, value: out }
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }, [activeTool, inputJson])

  const switchTool = (id: ToolId): void => {
    const next = TOOLS.find((t) => t.id === id)!
    setActiveTool(id)
    setInputJson(JSON.stringify(next.defaultInput, null, 2))
  }

  const copyConfig = (): void => {
    void navigator.clipboard.writeText(CONFIG_SNIPPET)
    setConfigCopied(true)
    setTimeout(() => setConfigCopied(false), 1500)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Breadcrumbs
          segments={[
            { label: 'Extend', to: '/extend' },
            { label: 'MCP' },
          ]}
        />

        {/* Header */}
        <div className="mt-4 mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">MCP server for AI agents</h1>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            mailc ships a Model Context Protocol server so AI agents (Claude Desktop, Cursor)
            can author and validate emails with structured tools instead of guessing at
            email markup. Below is a live explorer for every tool — same inputs and outputs
            as the stdio server, running in your browser.
          </p>
        </div>

        {/* Why MCP — short section */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-3">
          <WhyCard
            icon={<Sparkles className="h-4 w-4" />}
            title="Structured, not stochastic"
            text="Tools return JSON. Agents call them deterministically — no hallucinated tags."
          />
          <WhyCard
            icon={<Bot className="h-4 w-4" />}
            title="Self-correcting"
            text="validate_email_node returns FixInstructions. Agents fix bugs in one turn."
          />
          <WhyCard
            icon={<Terminal className="h-4 w-4" />}
            title="Zero install"
            text="npx -y mailc-mcp. Paste config snippet, restart your AI client, done."
          />
        </div>

        {/* Install / config snippet */}
        <div className="mb-10 rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-surface flex items-center justify-between">
            <span className="text-xs font-semibold">
              Install — paste into{' '}
              <code className="font-mono text-[11px]">~/.cursor/mcp.json</code>
              {' '}or{' '}
              <code className="font-mono text-[11px]">claude_desktop_config.json</code>
            </span>
            <button
              onClick={copyConfig}
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-md hover:bg-surface transition-colors"
            >
              {configCopied ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="p-4"><CodeBlock code={CONFIG_SNIPPET} language="json" /></div>
        </div>

        {/* Tool explorer */}
        <div className="mb-2 text-xs font-semibold text-foreground">Live tool explorer</div>
        <p className="mb-3 text-xs text-muted-foreground">
          Pick a tool, edit the JSON input, see the response your AI agent would receive.
        </p>

        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTool(t.id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-mono border transition-colors',
                activeTool === t.id
                  ? 'border-foreground/30 bg-surface text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tool description */}
        <p className="mb-4 text-sm text-muted-foreground">{tool.blurb}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Input */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-surface flex items-center justify-between">
              <span className="text-xs font-semibold">Input</span>
              <span className="text-[10px] font-mono text-muted-foreground">JSON</span>
            </div>
            <textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              spellCheck={false}
              className="w-full h-96 px-3 py-2 text-xs font-mono leading-relaxed bg-card focus:outline-none resize-none"
            />
          </div>

          {/* Output */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-surface flex items-center justify-between">
              <span className="text-xs font-semibold">Output</span>
              {result.ok ? (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> ok
                </span>
              ) : (
                <span className="text-[10px] font-mono text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> error
                </span>
              )}
            </div>
            <div className="p-3">
              <CodeBlock
                code={
                  result.ok
                    ? JSON.stringify(result.value, null, 2)
                    : `Failed to parse input or run tool:\n\n${result.error}`
                }
                language={result.ok ? 'json' : 'bash'}
                maxHeight={384}
              />
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="mt-6 text-[11px] text-muted-foreground italic max-w-3xl leading-relaxed">
          Note: this page calls mailc directly in your browser. The real{' '}
          <code className="font-mono">mailc-mcp</code> server is a Node process that exposes
          the same APIs over stdio — your AI client spawns it via the config snippet above.
          The inputs and outputs are identical.
        </p>

        <RelatedLinks
          links={[
            { to: '/extend/introspect', label: 'Introspect API', description: 'The same APIs the MCP tools wrap, callable directly.' },
            { to: '/extend/introspect/output', label: 'Output Explorer', description: 'See what HTML each component produces.' },
            { to: '/extend/plugins', label: 'Plugin Marketplace', description: 'Custom components via defineComponent().' },
          ]}
        />
      </div>
    </div>
  )
}

function WhyCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2 text-foreground/70">{icon}</div>
      <div className="text-xs font-semibold mb-1">{title}</div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{text}</p>
    </div>
  )
}
