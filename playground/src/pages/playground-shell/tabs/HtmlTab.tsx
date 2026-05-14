/**
 * HTML tab — compiled email HTML viewer with source-map line clicks. Reads
 * via `usePlayground()` so it works for both markup and JSON variants.
 */
import { useCallback } from 'react'
import { lookupByOutputLine } from '@/lib/source-map-lookups'
import { CodeEditor } from '@/components/ui/CodeEditor'
import { usePlayground } from '../playground-context'

export function HtmlTab() {
  const { useStore, selectSelectedEntry, pickDeepestByOutput } = usePlayground()
  const compiledHtml = useStore((s) => s.compiledHtml)
  const sourceMap = useStore((s) => s.sourceMap)
  const isCompiling = useStore((s) => s.isCompiling)
  const setSelectedEntry = useStore((s) => s.setSelectedEntry)
  const selectedEntry = useStore(selectSelectedEntry)

  const handleLineClick = useCallback(
    (lineNum: number) => {
      if (!sourceMap) return
      const entries = lookupByOutputLine(sourceMap, lineNum)
      const best = pickDeepestByOutput(entries)
      setSelectedEntry(best?.id ?? null)
    },
    [sourceMap, setSelectedEntry, pickDeepestByOutput],
  )

  const highlightLines = selectedEntry?.outputLoc
    ? {
        start: selectedEntry.outputLoc.startLine,
        end: selectedEntry.outputLoc.endLine,
      }
    : null

  if (isCompiling) {
    return (
      <div className="h-full flex items-center justify-center bg-card text-[11px] text-muted-foreground/60">
        Compiling…
      </div>
    )
  }

  if (!compiledHtml) {
    return (
      <div className="h-full flex items-center justify-center bg-card text-[11px] text-muted-foreground/60">
        Compilation output will appear here.
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-card">
      <div className="flex-1 overflow-hidden min-h-0">
        <CodeEditor
          language="html"
          value={compiledHtml}
          readOnly
          onLineClick={handleLineClick}
          highlightLines={highlightLines}
        />
      </div>
    </div>
  )
}
