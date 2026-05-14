/**
 * Preview tab — rendered email iframe with the same affordances as the
 * legacy `PreviewPanel`:
 *
 *   • Device-size toggle (desktop / mobile)
 *   • Inspect mode — click any rendered element to select its source-map entry
 *   • Selection highlight — outlined box on the currently selected entry
 *
 * Highlight + inspect are applied by mutating a `<style>` in the iframe's
 * contentDocument (sandbox includes `allow-same-origin`), so the iframe is
 * never re-rendered when only the selection changes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Monitor, Smartphone, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildPreviewSrcdoc } from '@/lib/preview-injector'
import { usePlayground } from '../playground-context'

// Tablet was dropped — the breakpoints between Desktop (≥600 default
// container width) and Mobile (375 fixed) cover the meaningful rendering
// states for email. The middle "Tablet" 768 width was effectively the same
// as Desktop because emails clamp to 600px, so it tested nothing new.
type PreviewMode = 'desktop' | 'mobile'

const PREVIEW_MODES: {
  id: PreviewMode
  label: string
  width: number | null
  icon: React.ReactNode
}[] = [
  { id: 'desktop', label: 'Desktop', width: null, icon: <Monitor className="h-3 w-3" /> },
  { id: 'mobile',  label: 'Mobile',  width: 375,  icon: <Smartphone className="h-3 w-3" /> },
]

const MIN_HEIGHT = 400

/** Inject / clear a highlight style for the currently selected entry. */
function applyHighlight(iframe: HTMLIFrameElement | null, entryId: string | null) {
  const doc = iframe?.contentDocument
  if (!doc) return
  let style = doc.getElementById('__mc_hl__') as HTMLStyleElement | null
  if (!style) {
    style = doc.createElement('style')
    style.id = '__mc_hl__'
    ;(doc.head ?? doc.body).appendChild(style)
  }
  if (entryId) {
    style.textContent =
      `[data-mc-id="${entryId}"] {` +
      '  outline: 3px solid #3b82f6 !important;' +
      '  outline-offset: 3px !important;' +
      '  box-shadow: 0 0 0 6px rgba(59,130,246,0.15) !important;' +
      '  position: relative !important;' +
      '  z-index: 9999 !important;' +
      '}'
    doc.querySelector<HTMLElement>(`[data-mc-id="${entryId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  } else {
    style.textContent = ''
  }
}

/** Inject / remove the inspect-mode hover stylesheet (cursor + outline). */
function applyInspectStyles(iframe: HTMLIFrameElement | null, active: boolean) {
  const doc = iframe?.contentDocument
  if (!doc) return
  let style = doc.getElementById('__mc_inspect__') as HTMLStyleElement | null
  if (active && !style) {
    style = doc.createElement('style')
    style.id = '__mc_inspect__'
    style.textContent = [
      '[data-mc-id] { cursor: crosshair !important; }',
      '[data-mc-id]:hover {',
      '  outline: 2px dashed rgba(99,102,241,0.55) !important;',
      '  outline-offset: 2px !important;',
      '}',
    ].join('\n')
    ;(doc.head ?? doc.body).appendChild(style)
  } else if (!active && style) {
    style.remove()
  }
}

export function PreviewTab() {
  const { useStore } = usePlayground()
  const compiledHtml = useStore((s) => s.compiledHtml)
  const compileRevision = useStore((s) => s.compileRevision)
  const selectedEntryId = useStore((s) => s.selectedEntryId)
  const setSelectedEntry = useStore((s) => s.setSelectedEntry)
  const isCompiling = useStore((s) => s.isCompiling)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(MIN_HEIGHT)
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop')
  const [inspectMode, setInspectMode] = useState(false)

  const activeMode = PREVIEW_MODES.find((m) => m.id === previewMode)!

  // Refs so iframe-load callbacks see the latest values.
  const selectedRef = useRef(selectedEntryId)
  useEffect(() => {
    selectedRef.current = selectedEntryId
  }, [selectedEntryId])
  const inspectRef = useRef(inspectMode)
  useEffect(() => {
    inspectRef.current = inspectMode
  }, [inspectMode])

  const inspectListenerRef = useRef<((e: Event) => void) | null>(null)

  // Iframe self-reports its scrollHeight via postMessage (see preview-injector).
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'mc-resize' && typeof e.data.height === 'number') {
        setIframeHeight(Math.max(e.data.height, MIN_HEIGHT))
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Reset to MIN_HEIGHT when the source flips so the previous height doesn't
  // flash through during the new compile.
  useEffect(() => {
    const t = setTimeout(() => setIframeHeight(MIN_HEIGHT), 0)
    return () => clearTimeout(t)
  }, [compiledHtml])

  // Selection → highlight (no reload).
  useEffect(() => {
    applyHighlight(iframeRef.current, selectedEntryId)
  }, [selectedEntryId])

  const handleInspectClick = useCallback(
    (e: Event) => {
      e.preventDefault()
      const target = e.target as Element | null
      if (!target) return
      const el = target.closest('[data-mc-id]')
      if (el) {
        const id = el.getAttribute('data-mc-id')
        if (id) setSelectedEntry(id)
      }
    },
    [setSelectedEntry],
  )

  const attachInspect = useCallback(
    (iframe: HTMLIFrameElement | null) => {
      const doc = iframe?.contentDocument
      if (!doc) return
      if (inspectListenerRef.current) {
        doc.removeEventListener('click', inspectListenerRef.current, true)
      }
      doc.addEventListener('click', handleInspectClick, true)
      inspectListenerRef.current = handleInspectClick
    },
    [handleInspectClick],
  )

  const detachInspect = useCallback((iframe: HTMLIFrameElement | null) => {
    const doc = iframe?.contentDocument
    if (!doc || !inspectListenerRef.current) return
    doc.removeEventListener('click', inspectListenerRef.current, true)
    inspectListenerRef.current = null
  }, [])

  // Inspect mode toggle → swap styles + click listener.
  useEffect(() => {
    applyInspectStyles(iframeRef.current, inspectMode)
    if (inspectMode) attachInspect(iframeRef.current)
    else detachInspect(iframeRef.current)
    return () => detachInspect(iframeRef.current)
  }, [inspectMode, attachInspect, detachInspect])

  // After every iframe load, re-apply the highlight + inspect listener
  // (contentDocument is replaced on srcdoc change so they're lost).
  const handleLoad = useCallback(() => {
    applyHighlight(iframeRef.current, selectedRef.current)
    if (inspectRef.current) {
      applyInspectStyles(iframeRef.current, true)
      attachInspect(iframeRef.current)
    }
  }, [attachInspect])

  const srcdoc = useMemo(
    () => (compiledHtml ? buildPreviewSrcdoc(compiledHtml) : null),
    [compiledHtml],
  )

  return (
    <div className="h-full flex flex-col overflow-hidden bg-card">
      {/* ── Toolbar ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card shrink-0">
        {/* Device size toggle */}
        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          {PREVIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setPreviewMode(mode.id)}
              title={mode.width ? `${mode.label} (${mode.width}px)` : mode.label}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                previewMode === mode.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {mode.icon}
              <span>{mode.label}</span>
              {mode.width && (
                <span className="text-muted-foreground/50 hidden md:inline">
                  {mode.width}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Inspect toggle */}
        <button
          type="button"
          onClick={() => setInspectMode((v) => !v)}
          disabled={!srcdoc}
          title={inspectMode ? 'Exit inspect mode' : 'Inspect — click any element to select it'}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-colors',
            inspectMode
              ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/25'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface',
            !srcdoc && 'opacity-30 cursor-not-allowed',
          )}
        >
          <Crosshair className="h-3 w-3" />
          Inspect
        </button>

        {!isCompiling && !inspectMode && selectedEntryId && (
          <span className="ml-auto text-[10px] text-blue-500/80 dark:text-blue-400/80 font-mono">
            ● highlighted
          </span>
        )}
      </div>

      {/* Inspect mode banner */}
      {inspectMode && (
        <div className="px-3 py-1.5 bg-indigo-500/10 border-b border-indigo-500/20 shrink-0 flex items-center gap-2">
          <Crosshair className="h-3 w-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <p className="text-[10px] text-indigo-500 dark:text-indigo-400 flex-1">
            Click any element in the preview to inspect it
          </p>
          <button
            type="button"
            onClick={() => setInspectMode(false)}
            className="text-indigo-500/60 hover:text-indigo-500 transition-colors"
            title="Exit inspect mode"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Iframe surface ─────────────────────────────────── */}
      <div
        className={cn(
          'flex-1 overflow-y-auto flex justify-center',
          inspectMode ? 'bg-zinc-300 dark:bg-zinc-800' : 'bg-zinc-200 dark:bg-zinc-900',
        )}
      >
        {srcdoc ? (
          <div
            style={
              activeMode.width
                ? { width: `${activeMode.width}px`, flexShrink: 0 }
                : { width: '100%' }
            }
          >
            <iframe
              key={compileRevision}
              ref={iframeRef}
              srcDoc={srcdoc}
              onLoad={handleLoad}
              style={{ height: `${iframeHeight}px`, width: '100%' }}
              className="border-0 block"
              sandbox="allow-same-origin allow-scripts"
              title={`Email Preview — ${activeMode.label}`}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-32 gap-2 w-full">
            <Monitor className="h-6 w-6 text-muted-foreground/20" />
            <p className="text-[11px] text-muted-foreground/40">
              {isCompiling ? 'Compiling…' : 'Compile to preview'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
