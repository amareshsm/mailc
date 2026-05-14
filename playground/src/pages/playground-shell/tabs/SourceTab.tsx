/**
 * Source tab — `.mc` markup or JSON viewer/editor with source-map line clicks.
 *
 * Polymorphic: language + title come from the active playground bundle, so
 * the same component renders as "Markup" (xml) for `/build/code` and as
 * "JSON" (json) for `/build/json`. No store imports here — everything is
 * read through `usePlayground()`.
 *
 * Two modes:
 *   • Read-only: line-clickable viewer; click a line to select the matching
 *     source-map entry (drives every other tab's highlight).
 *   • Edit: full editor with ⌘/Ctrl+Enter to compile and Esc to cancel.
 */
import { useCallback } from 'react'
import { Pencil, Play, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { lookupBySourceLine } from '@/lib/source-map-lookups'
import { CodeEditor } from '@/components/ui/CodeEditor'
import { usePlayground } from '../playground-context'

export function SourceTab() {
  const {
    useStore,
    selectSelectedEntry,
    pickDeepestBySource,
    sourceLanguage,
  } = usePlayground()

  const source = useStore((s) => s.source)
  const draftSource = useStore((s) => s.draftSource)
  const sourceMap = useStore((s) => s.sourceMap)
  const sourceJump = useStore((s) => s.sourceJump)
  const isEditing = useStore((s) => s.isEditing)
  const isCompiling = useStore((s) => s.isCompiling)
  const setSelectedEntry = useStore((s) => s.setSelectedEntry)
  const setDraftSource = useStore((s) => s.setDraftSource)
  const setEditing = useStore((s) => s.setEditing)
  const saveAndCompile = useStore((s) => s.saveAndCompile)
  const selectedEntry = useStore(selectSelectedEntry)

  const isDirty = draftSource !== source

  const handleLineClick = useCallback(
    (lineNum: number) => {
      if (!sourceMap) return
      const entries = lookupBySourceLine(sourceMap, lineNum)
      const best = pickDeepestBySource(entries)
      setSelectedEntry(best?.id ?? null)
    },
    [sourceMap, setSelectedEntry, pickDeepestBySource],
  )

  const handleCompile = useCallback(() => {
    saveAndCompile()
  }, [saveAndCompile])

  const handleCancel = useCallback(() => {
    setDraftSource(source)
    setEditing(false)
  }, [setDraftSource, setEditing, source])

  const handleEditKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleCompile()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    },
    [handleCompile, handleCancel],
  )

  const highlightLines = selectedEntry?.sourceLoc
    ? {
        start: selectedEntry.sourceLoc.startLine,
        end: selectedEntry.sourceLoc.endLine,
      }
    : null

  return (
    <div className="h-full flex flex-col overflow-hidden bg-card">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card shrink-0">
        {!isEditing ? (
          <>
            <span className="text-[10px] text-muted-foreground">
              Read-only — click a line to inspect.
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          </>
        ) : (
          <>
            <span className="text-[10px] text-amber-600 dark:text-amber-400">
              Editing — <kbd className="font-mono">⌘↵</kbd> to compile,{' '}
              <kbd className="font-mono">Esc</kbd> to cancel
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCompile}
              disabled={!isDirty || isCompiling}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer',
                'bg-blue-500 text-white hover:bg-blue-600',
                (!isDirty || isCompiling) && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Play className="h-3 w-3" />
              Compile
            </button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {!isEditing ? (
          source ? (
            <CodeEditor
              language={sourceLanguage}
              value={source}
              readOnly
              onLineClick={handleLineClick}
              highlightLines={highlightLines}
              jumpLine={sourceJump}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/60">
              No source yet — click Edit to start.
            </div>
          )
        ) : (
          <CodeEditor
            language={sourceLanguage}
            value={draftSource}
            onChange={setDraftSource}
            onKeyDown={handleEditKeyDown}
          />
        )}
      </div>
    </div>
  )
}
