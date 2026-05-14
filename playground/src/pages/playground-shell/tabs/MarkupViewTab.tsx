/**
 * Markup view tab — read-only `.mc` markup derived from the current JSON IR.
 *
 * Mounted on the JSON playground (`/build/json`) to show users what their
 * JSON IR serialises to as mailc markup. Updates live as the JSON changes.
 * JSON remains the source of truth on this route — this tab never writes back.
 */
import { useMemo, useState, useCallback } from 'react'
import { Check, Copy } from 'lucide-react'
import { jsonToMarkup, type MCNode } from 'mailc'
import { CodeEditor } from '@/components/ui/CodeEditor'
import { usePlayground } from '../playground-context'

/**
 * Unwrap an MCDocument's `template` field if present; otherwise pass the
 * node through. Lets users paste either shape into the JSON editor.
 */
function asMCNode(parsed: unknown): MCNode {
  if (parsed && typeof parsed === 'object' && 'template' in parsed) {
    return (parsed as { template: MCNode }).template
  }
  return parsed as MCNode
}

export function MarkupViewTab() {
  const { useStore } = usePlayground()
  const source = useStore((s) => s.source)
  const [copied, setCopied] = useState(false)

  const { markup, error } = useMemo(() => {
    if (!source) return { markup: '', error: null as string | null }
    try {
      const parsed = JSON.parse(source)
      const node = asMCNode(parsed)
      return { markup: jsonToMarkup(node), error: null }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { markup: '', error: msg }
    }
  }, [source])

  const handleCopy = useCallback(async () => {
    if (!markup) return
    try {
      await navigator.clipboard.writeText(markup)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // Clipboard API can fail in insecure contexts — silently skip.
    }
  }, [markup])

  return (
    <div className="h-full flex flex-col overflow-hidden bg-card">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card shrink-0">
        <span className="text-[10px] text-muted-foreground">
          Derived from JSON — read-only.
        </span>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!markup}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {error ? (
          <div className="h-full flex items-center justify-center px-4 text-center text-[11px] text-amber-600 dark:text-amber-400">
            Cannot derive markup — JSON is not parseable.
            <br />
            <span className="text-muted-foreground/70">{error}</span>
          </div>
        ) : markup ? (
          <CodeEditor language="xml" value={markup} readOnly />
        ) : (
          <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/60">
            No JSON yet.
          </div>
        )}
      </div>
    </div>
  )
}
