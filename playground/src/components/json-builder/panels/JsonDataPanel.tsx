/**
 * Template data panel for the JSON builder.
 *
 * Provides a JSON editor for template data used to resolve {{ expressions }}
 * in content fields. e.g. { "user": { "name": "Alice" } } enables
 * "Hello {{ user.name }}" in text content.
 */

import { useState, useEffect } from 'react'
import { useJsonBuilderStore } from '@/store/json-builder-store'
import { Button } from '@/components/ui/button'
import { Check, AlertCircle, Database } from 'lucide-react'
import type { MCNode } from 'mailc'

/** Scan all nodes recursively for {{ }} template expressions. */
function extractTemplateTokens(nodes: MCNode[]): string[] {
  const tokens = new Set<string>()
  const pattern = /\{\{\s*([\w.[\]]+)\s*\}\}/g

  function scan(node: MCNode) {
    if (node.content) {
      let m: RegExpExecArray | null
      while ((m = pattern.exec(node.content)) !== null) {
        tokens.add(m[1])
      }
    }
    if (node.children) {
      for (const child of node.children) {
        scan(child)
      }
    }
  }

  for (const node of nodes) {
    scan(node)
  }

  return [...tokens].sort()
}

export function JsonDataPanel() {
  const nodes = useJsonBuilderStore((s) => s.nodes)
  const templateData = useJsonBuilderStore((s) => s.templateData)
  const setTemplateData = useJsonBuilderStore((s) => s.setTemplateData)

  const [draft, setDraft] = useState(() => JSON.stringify(templateData, null, 2))
  const [parseError, setParseError] = useState('')
  const [applied, setApplied] = useState(false)

  // Sync draft when external changes happen
  useEffect(() => {
    const current = JSON.stringify(templateData, null, 2)
    setDraft(current)
  }, [])

  const handleApply = () => {
    try {
      const parsed = JSON.parse(draft)
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        setParseError('Template data must be a JSON object (not an array or null)')
        return
      }
      setParseError('')
      setTemplateData(parsed as Record<string, unknown>)
      setApplied(true)
      setTimeout(() => setApplied(false), 1500)
    } catch {
      setParseError('Invalid JSON — check for missing commas, quotes, or brackets')
    }
  }

  const tokens = extractTemplateTokens(nodes)

  return (
    <div className="flex flex-col gap-4 p-3 overflow-auto h-full">
      {/* Explanation */}
      <div className="rounded-md bg-surface border border-border p-3 text-xs">
        <div className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" />
          Template Data
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Data resolves{' '}
          <code className="bg-background px-1 rounded">{'{{ expressions }}'}</code> in content
          fields. Example:{' '}
          <code className="bg-background px-1 rounded">
            {'{ "user": { "name": "Alice" } }'}
          </code>{' '}
          enables{' '}
          <code className="bg-background px-1 rounded">Hello {'{{ user.name }}'}</code> in text
          content.
        </p>
      </div>

      {/* Detected tokens */}
      {tokens.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-2">
            Detected Template Variables ({tokens.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {tokens.map((token) => (
              <code
                key={token}
                className="text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded text-muted-foreground"
              >
                {'{{ '}
                {token}
                {' }}'}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* JSON editor */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-foreground">Data JSON</p>
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setParseError('')
          }}
          rows={12}
          spellCheck={false}
          className="w-full rounded border border-border bg-background px-2 py-2 text-xs font-mono text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder={'{\n  "user": {\n    "name": "Alice"\n  }\n}'}
        />
        {parseError && (
          <div className="flex items-start gap-1.5 text-xs text-red-500">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {parseError}
          </div>
        )}
        <Button size="sm" onClick={handleApply} className="self-end">
          {applied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1" />
              Applied
            </>
          ) : (
            'Apply Data'
          )}
        </Button>
      </div>
    </div>
  )
}
