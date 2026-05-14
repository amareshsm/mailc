/**
 * Source map panel for the JSON builder.
 *
 * Shows a table of source map entries (id | type | line | col).
 *
 * NOTE: Each node's id appears as data-mc-id in the compiled HTML,
 * bridging builder UI ↔ compiled output. This is the sourceMap: true
 * bridge — when you select a node in the builder, you can look up its
 * position in the compiled HTML via its id.
 */

import { useJsonBuilderStore } from '@/store/json-builder-store'
import { Map, Info } from 'lucide-react'

interface SourceMapEntry {
  id?: string
  type?: string
  source?: { line?: number; col?: number }
  output?: { line?: number; col?: number }
}

export function JsonSourceMapPanel() {
  const sourceMapJSON = useJsonBuilderStore((s) => s.sourceMapJSON)
  const compiledHtml = useJsonBuilderStore((s) => s.compiledHtml)

  if (!sourceMapJSON) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Map className="h-8 w-8 opacity-30" />
        <p className="text-sm">No source map available</p>
        <p className="text-xs text-muted-foreground/60">Compile with sourceMap: true</p>
      </div>
    )
  }

  let parsed: { entries?: SourceMapEntry[]; [key: string]: unknown } | null = null
  try {
    parsed = JSON.parse(sourceMapJSON)
  } catch {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <p className="text-sm text-red-500">Failed to parse source map JSON</p>
      </div>
    )
  }

  const entries: SourceMapEntry[] = parsed?.entries ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary */}
      <div className="px-3 py-2 border-b border-border bg-surface shrink-0 space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Entries:</span>
          <span className="font-medium text-foreground">{entries.length}</span>
        </div>
        {compiledHtml && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Components with data-mc-id:</span>
            <span className="font-medium text-foreground">
              {(compiledHtml.match(/data-mc-id=/g) || []).length}
            </span>
          </div>
        )}
      </div>

      {/* Bridge explanation */}
      <div className="px-3 py-2 border-b border-border bg-blue-50 dark:bg-blue-950/20 text-xs text-blue-600 dark:text-blue-400 shrink-0 flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Each node&apos;s <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">id</code>{' '}
          appears as{' '}
          <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">data-mc-id</code> in the
          compiled HTML, bridging builder UI ↔ compiled output.
        </span>
      </div>

      {/* Entries table */}
      {entries.length > 0 ? (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface sticky top-0">
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">ID</th>
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Source</th>
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Output</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={i}
                  className="border-b border-border/50 hover:bg-surface transition-colors"
                >
                  <td className="px-2 py-1 font-mono text-[10px] text-muted-foreground truncate max-w-[80px]">
                    {entry.id ?? '—'}
                  </td>
                  <td className="px-2 py-1 font-mono text-[10px] text-blue-500">
                    {entry.type ?? '—'}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {entry.source
                      ? `${entry.source.line ?? '?'}:${entry.source.col ?? '?'}`
                      : '—'}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {entry.output
                      ? `${entry.output.line ?? '?'}:${entry.output.col ?? '?'}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No source map entries found
        </div>
      )}
    </div>
  )
}
