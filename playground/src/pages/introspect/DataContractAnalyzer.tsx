import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Database, Wand2, Copy, Check } from 'lucide-react'
import {
  getIntrospect,
  parseTemplate,
  type DataContract,
} from '@/introspect-demo/api'
import { CodeBlock } from '@/components/ui/code-block'

// ---------------------------------------------------------------------------
// Curated examples
// ---------------------------------------------------------------------------

interface Example {
  label: string
  source: string
}

const EXAMPLES: Example[] = [
  {
    label: 'Simple — required only',
    source: `<mc>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Hello {{user.name}},</mc-text>
        <mc-text>Welcome to {{company.name}}.</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },
  {
    label: 'Conditional — required + optional',
    source: `<mc>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Hi {{user.name}},</mc-text>
        <mc-if condition="user.isPro">
          <mc-text>Thanks for being a Pro member 👑 ({{user.proExpiresAt}})</mc-text>
        </mc-if>
        <mc-if condition="user.cartItems">
          <mc-text>You have items in your cart.</mc-text>
        </mc-if>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },
  {
    label: 'Loop — order receipt',
    source: `<mc>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Hi {{user.name}}, here is your receipt:</mc-text>
        <mc-each items="order.items" as="item">
          <mc-text>• {{item.name}} — \${{item.price}} × {{item.quantity}}</mc-text>
        </mc-each>
        <mc-text>Total: \${{order.total}}</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },
]

// ---------------------------------------------------------------------------
// TypeScript type generator (best-effort, structural)
// ---------------------------------------------------------------------------

interface TreeNode {
  type: 'object' | 'leaf' | 'array'
  optional: boolean
  // for object
  children?: Record<string, TreeNode>
  // for array
  itemShape?: TreeNode
}

function makeNode(type: TreeNode['type'], optional: boolean): TreeNode {
  const node: TreeNode = { type, optional }
  if (type === 'object') node.children = {}
  return node
}

function setPath(
  root: Record<string, TreeNode>,
  path: string[],
  optional: boolean,
): void {
  let cursor = root
  for (let i = 0; i < path.length; i++) {
    const seg = path[i]!
    const isLeaf = i === path.length - 1
    const existing = cursor[seg]
    if (!existing) {
      cursor[seg] = isLeaf
        ? makeNode('leaf', optional)
        : makeNode('object', optional)
    } else {
      // If a path segment is required somewhere, prefer required.
      if (!optional) existing.optional = false
      // If we previously called it leaf but now need to recurse, upgrade.
      if (existing.type === 'leaf' && !isLeaf) {
        existing.type = 'object'
        existing.children = {}
      }
    }
    if (!isLeaf) {
      cursor = cursor[seg]!.children!
    }
  }
}

function buildShape(contract: DataContract): Record<string, TreeNode> {
  const root: Record<string, TreeNode> = {}

  // Required fields
  for (const f of contract.required) {
    if (f.loopScope) continue
    setPath(root, f.path.split('.'), false)
  }

  // Optional fields
  for (const f of contract.optional) {
    if (f.loopScope) continue
    setPath(root, f.path.split('.'), true)
  }

  // Loops: source is an array; itemShape is built from usedPaths
  for (const loop of contract.loops) {
    const sourcePath = loop.source.split('.')
    setPath(root, sourcePath, false)

    // Find the array node
    let cursor: TreeNode | undefined = root[sourcePath[0]!]
    for (let i = 1; i < sourcePath.length && cursor; i++) {
      cursor = cursor.children?.[sourcePath[i]!]
    }
    if (!cursor) continue
    cursor.type = 'array'
    cursor.itemShape = makeNode('object', false)
    cursor.itemShape.children = {}

    for (const used of loop.usedPaths) {
      // used path looks like "item.name" — strip the loop variable prefix
      const parts = used.split('.')
      if (parts[0] === loop.variable) parts.shift()
      if (parts.length === 0) continue
      setPath(cursor.itemShape.children!, parts, false)
    }
  }

  return root
}

function emitTS(shape: Record<string, TreeNode>, indent = 0): string {
  const pad = '  '.repeat(indent)
  const innerPad = '  '.repeat(indent + 1)
  const entries = Object.entries(shape)
  if (entries.length === 0) return '{}'
  const lines = entries.map(([key, node]) => {
    const opt = node.optional ? '?' : ''
    let type: string
    if (node.type === 'leaf') {
      type = 'unknown'
    } else if (node.type === 'object') {
      type = emitTS(node.children ?? {}, indent + 1)
    } else {
      // array
      const itemType = node.itemShape
        ? emitTS(node.itemShape.children ?? {}, indent + 1)
        : 'unknown'
      type = `Array<${itemType}>`
    }
    return `${innerPad}${key}${opt}: ${type};`
  })
  return `{\n${lines.join('\n')}\n${pad}}`
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DataContractAnalyzer() {
  const [source, setSource] = useState<string>(EXAMPLES[2]!.source)
  const [contract, setContract] = useState<DataContract | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tsCopied, setTsCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const ast = await parseTemplate(source)
        const introspect = await getIntrospect()
        const c = introspect.dataContract(ast) as DataContract
        if (cancelled) return
        setContract(c)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(String(err))
        setContract(null)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [source])

  const tsType = contract
    ? `interface TemplateData ${emitTS(buildShape(contract))}`
    : ''

  async function copyTs() {
    if (!tsType) return
    await navigator.clipboard.writeText(tsType)
    setTsCopied(true)
    setTimeout(() => setTsCopied(false), 1500)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <Link
          to="/introspect"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Introspect
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <Database className="h-4 w-4 text-amber-400" />
          <h1 className="text-xl font-bold text-foreground">
            Data Contract Analyzer
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Static analysis of <code className="text-[11px] font-mono">{`{{vars}}`}</code>,{' '}
          <code className="text-[11px] font-mono">mc-if</code>, and{' '}
          <code className="text-[11px] font-mono">mc-each</code>. Emits a
          TypeScript interface for the data shape your template needs.
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* Source */}
        <div className="flex flex-col overflow-hidden border-r border-border">
          <div className="px-5 py-3 border-b border-border bg-surface/30 shrink-0 flex items-center gap-3 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              .mc source
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              <Wand2 className="h-3 w-3 text-muted-foreground" />
              {EXAMPLES.map((e) => (
                <button
                  key={e.label}
                  onClick={() => setSource(e.source)}
                  className="text-[11px] px-2 py-0.5 rounded bg-background border border-border hover:border-foreground/40 text-foreground transition-colors"
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            className="flex-1 p-5 bg-background text-foreground font-mono text-[13px] leading-relaxed border-0 outline-none resize-none"
          />
        </div>

        {/* Analysis */}
        <div className="flex flex-col overflow-hidden bg-background">
          <div className="px-5 py-3 border-b border-border bg-surface/30 shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Data Contract
            </span>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-5">
            {error && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200 font-mono">
                {error}
              </div>
            )}

            {contract && (
              <>
                {/* Required */}
                <FieldList
                  heading="Required fields"
                  subhead="Always accessed — sending without these breaks output."
                  fields={contract.required.filter((f) => !f.loopScope)}
                  empty="No required fields."
                  accent="text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                />

                {/* Optional */}
                <FieldList
                  heading="Optional fields"
                  subhead="Gated by mc-if — template renders without them."
                  fields={contract.optional.filter((f) => !f.loopScope)}
                  empty="No optional fields."
                  accent="text-amber-400 bg-amber-500/10 border-amber-500/25"
                />

                {/* Loops */}
                <section>
                  <h2 className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                    Loops
                  </h2>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Each mc-each block. The source path must be
                    an iterable.
                  </p>
                  {contract.loops.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No loops.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {contract.loops.map((loop, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-3"
                        >
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/25">
                              loop
                            </span>
                            <code className="text-xs font-mono text-foreground">
                              for {loop.variable} in {loop.source}
                            </code>
                          </div>
                          <div className="text-[11px] text-muted-foreground mb-1">
                            Per-item fields used:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {loop.usedPaths.length === 0 ? (
                              <span className="text-[11px] italic text-muted-foreground">
                                (variable used as a whole, no field access)
                              </span>
                            ) : (
                              loop.usedPaths.map((p) => (
                                <code
                                  key={p}
                                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-background border border-border text-foreground"
                                >
                                  {p}
                                </code>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* TS shape */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                      Generated TypeScript
                    </h2>
                    <button
                      onClick={copyTs}
                      className="text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border hover:border-foreground/40 text-foreground transition-colors"
                    >
                      {tsCopied ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {tsCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    A type stub for your template's data — feed this into a
                    typed renderEmail() call.
                  </p>
                  <CodeBlock code={tsType} language="typescript" />
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldList({
  heading,
  subhead,
  fields,
  empty,
  accent,
}: {
  heading: string
  subhead: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields: any[]
  empty: string
  accent: string
}) {
  return (
    <section>
      <h2 className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
        {heading}
      </h2>
      <p className="text-[11px] text-muted-foreground mb-3">{subhead}</p>
      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{empty}</p>
      ) : (
        <div className="space-y-1.5">
          {fields.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 flex-wrap rounded-md border border-border bg-surface/30 px-3 py-1.5"
            >
              <code className="text-xs font-mono text-foreground">{f.path}</code>
              <span
                className={`text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border ${accent}`}
              >
                {f.usedIn}
              </span>
              {f.condition && (
                <span className="text-[11px] text-muted-foreground italic">
                  if{' '}
                  <code className="font-mono text-foreground">{f.condition}</code>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
