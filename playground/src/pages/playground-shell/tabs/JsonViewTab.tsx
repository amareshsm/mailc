/**
 * JSON view tab — read-only JSON IR derived from the current markup.
 *
 * Mounted on the markup playground (`/build/code`) to show users what the
 * JSON intermediate representation looks like for the markup they're editing.
 * Updates live as the markup changes. Markup remains the source of truth on
 * this route — this tab never writes back.
 */
import { useMemo, useState, useCallback } from 'react'
import { Check, Copy } from 'lucide-react'
import { markupToJSON } from 'mailc'
import { CodeEditor } from '@/components/ui/CodeEditor'
import { usePlayground } from '../playground-context'

export function JsonViewTab() {
  const { useStore } = usePlayground()
  const source = useStore((s) => s.source)
  const [copied, setCopied] = useState(false)

  // Derive JSON IR from the current markup. Memoised so we don't re-parse
  // on every render — only when the markup string changes.
  const { json, error } = useMemo(() => {
    if (!source) return { json: '', error: null as string | null }
    try {
      const node = markupToJSON(source)
      return { json: JSON.stringify(node, null, 2), error: null }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { json: '', error: msg }
    }
  }, [source])

  const handleCopy = useCallback(async () => {
    if (!json) return
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // Clipboard API can fail in insecure contexts — silently skip.
    }
  }, [json])

  return (
    <div className="h-full flex flex-col overflow-hidden bg-card">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card shrink-0">
        <span className="text-[10px] text-muted-foreground">
          Derived from markup — read-only.
        </span>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!json}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {error ? (
          <div className="h-full flex items-center justify-center px-4 text-center text-[11px] text-amber-600 dark:text-amber-400">
            Cannot derive JSON — markup has a parse error.
            <br />
            <span className="text-muted-foreground/70">{error}</span>
          </div>
        ) : json ? (
          <CodeEditor language="json" value={json} readOnly />
        ) : (
          <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/60">
            No markup yet.
          </div>
        )}
      </div>
    </div>
  )
}
