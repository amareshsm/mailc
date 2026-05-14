/**
 * Dark Theme Preview page — `/dark-theme` route.
 *
 * Three-panel layout:
 *   [Code editor + console | Light preview | Dark preview]
 *
 * A single compile worker produces one HTML output. The light panel
 * renders it as-is; the dark panel wraps it with
 * `buildPreviewSrcdoc(html, { darkMode: true })` which injects
 * `:root { color-scheme: dark }` so that any `@media (prefers-color-scheme: dark)`
 * rules inside mc-style blocks activate — exactly how Apple Mail / iOS Mail work.
 */
import { useEffect, useRef, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { CodeEditor } from '@/components/ui/CodeEditor'
import { ConsolePanel } from '@/components/ui/ConsolePanel'
import { buildPreviewSrcdoc } from '@/lib/preview-injector'
import {
  useDarkThemeStore,
  issuesToEntries,
} from '@/store/dark-theme-store'
import type { CompileWorkerResponse } from '@/workers/compile-worker-types'
import { Monitor, Smartphone, Sun, Moon } from 'lucide-react'
import CompileWorker from '@/workers/compile.worker?worker'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Monotonically increasing request id — lets us discard stale responses. */
let requestId = 0

const DESKTOP_WIDTH = 600
const MOBILE_WIDTH = 375

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DarkThemePage() {
  const {
    markupCode,
    compiledHtml,
    compileTimeMs,
    consoleEntries,
    setMarkupCode,
    setCompiledHtml,
    setCompileTimeMs,
    setConsoleEntries,
  } = useDarkThemeStore()

  const [consoleOpen, setConsoleOpen] = useState(false)
  const [consoleFilter, setConsoleFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')
  const [previewWidth, setPreviewWidth] = useState(DESKTOP_WIDTH)
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop')

  const workerRef = useRef<Worker | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestIdRef = useRef(0)
  const lightIframeRef = useRef<HTMLIFrameElement>(null)
  const darkIframeRef = useRef<HTMLIFrameElement>(null)

  // ── Worker lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    const worker = new CompileWorker()
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<CompileWorkerResponse>) => {
      const res = event.data
      if (res.id < latestIdRef.current) return
      latestIdRef.current = res.id
      setCompiledHtml(res.html)
      setCompileTimeMs(res.timeMs)
      setConsoleEntries([
        ...issuesToEntries(res.errors),
        ...issuesToEntries(res.warnings),
        ...issuesToEntries(res.info),
      ])
    }

    return () => worker.terminate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Debounced compilation ─────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!workerRef.current) return
      const id = ++requestId
      latestIdRef.current = id
      workerRef.current.postMessage({ id, source: markupCode })
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [markupCode])

  // ── Srcdocs ───────────────────────────────────────────────────────────────
  const lightSrcdoc = useMemo(
    () => (compiledHtml ? buildPreviewSrcdoc(compiledHtml) : null),
    [compiledHtml],
  )
  const darkSrcdoc = useMemo(
    () => (compiledHtml ? buildPreviewSrcdoc(compiledHtml, { darkMode: true }) : null),
    [compiledHtml],
  )

  // ── Auto-resize both iframes from the mc-resize postMessage ──────────────
  // Both iframes compile the same HTML, so their scroll heights match.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'mc-resize') return
      const h = Math.ceil(e.data.height as number)
      if (lightIframeRef.current) lightIframeRef.current.style.height = `${h}px`
      if (darkIframeRef.current) darkIframeRef.current.style.height = `${h}px`
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // ── Viewport toggle ───────────────────────────────────────────────────────
  const switchViewport = (mode: 'desktop' | 'mobile') => {
    setViewportMode(mode)
    setPreviewWidth(mode === 'mobile' ? MOBILE_WIDTH : DESKTOP_WIDTH)
  }

  // ── Derived counts for editor status bar ─────────────────────────────────
  const errorCount   = consoleEntries.filter((e) => e.severity === 'error').length
  const warningCount = consoleEntries.filter((e) => e.severity === 'warning').length

  return (
    <div className="flex-1 flex overflow-hidden">

      {/* ── LEFT: Code editor (40%) ────────────────────────────────────── */}
      <div className="w-[40%] shrink-0 flex flex-col border-r border-border overflow-hidden">

        {/* Editor toolbar */}
        <div className="h-10 shrink-0 border-b border-border bg-card flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">mailc</span>
            <span className="text-[10px] font-mono text-muted-foreground bg-surface px-1.5 py-0.5 rounded">
              .mc
            </span>
          </div>
          <div className="flex items-center gap-2">
            {compileTimeMs > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {compileTimeMs}ms
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-[10px] font-mono bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded">
                {errorCount} error{errorCount !== 1 ? 's' : ''}
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-[10px] font-mono bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded">
                {warningCount} warning{warningCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* CodeMirror */}
        <div className="flex-1 overflow-hidden min-h-0">
          <CodeEditor
            language="xml"
            value={markupCode}
            onChange={setMarkupCode}
          />
        </div>

        {/* Console */}
        <ConsolePanel
          entries={consoleEntries}
          open={consoleOpen}
          filter={consoleFilter}
          onToggle={() => setConsoleOpen((o) => !o)}
          onClear={() => setConsoleEntries([])}
          onFilterChange={setConsoleFilter}
        />
      </div>

      {/* ── CENTER: Light preview ───────────────────────────────────────── */}
      <PreviewPane
        label="Light"
        icon={<Sun className="h-3 w-3 text-amber-400" />}
        srcdoc={lightSrcdoc}
        iframeRef={lightIframeRef}
        previewWidth={previewWidth}
        viewportMode={viewportMode}
        onSwitchViewport={switchViewport}
        frameClass="bg-zinc-100 dark:bg-zinc-200/10"
        borderClass="border-r border-border"
      />

      {/* ── RIGHT: Dark preview ─────────────────────────────────────────── */}
      <PreviewPane
        label="Dark"
        icon={<Moon className="h-3 w-3 text-indigo-400" />}
        srcdoc={darkSrcdoc}
        iframeRef={darkIframeRef}
        previewWidth={previewWidth}
        viewportMode={viewportMode}
        onSwitchViewport={switchViewport}
        // Simulate a dark-mode email-client shell
        frameClass="bg-[#1c1c1e]"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// PreviewPane — shared panel used for both light and dark previews
// ---------------------------------------------------------------------------

interface PreviewPaneProps {
  label: string
  icon: React.ReactNode
  srcdoc: string | null
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  previewWidth: number
  viewportMode: 'desktop' | 'mobile'
  onSwitchViewport: (mode: 'desktop' | 'mobile') => void
  frameClass?: string
  borderClass?: string
}

function PreviewPane({
  label,
  icon,
  srcdoc,
  iframeRef,
  previewWidth,
  viewportMode,
  onSwitchViewport,
  frameClass,
  borderClass,
}: PreviewPaneProps) {
  return (
    <div className={cn('flex-1 flex flex-col min-w-0 overflow-hidden', borderClass)}>

      {/* Pane header */}
      <div className="h-10 shrink-0 border-b border-border bg-card flex items-center justify-between px-3">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-xs font-medium text-foreground">{label}</span>
        </div>

        {/* Desktop / Mobile toggle — synced across both panes */}
        <div className="flex items-center gap-0.5 bg-surface rounded-md p-0.5">
          <button
            onClick={() => onSwitchViewport('desktop')}
            className={cn(
              'p-1 rounded transition-colors',
              viewportMode === 'desktop'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title="Desktop (600px)"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onSwitchViewport('mobile')}
            className={cn(
              'p-1 rounded transition-colors',
              viewportMode === 'mobile'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title="Mobile (375px)"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Frame area */}
      <div className={cn('flex-1 overflow-auto p-4 flex justify-center', frameClass)}>
        {srcdoc ? (
          <iframe
            ref={iframeRef}
            srcDoc={srcdoc}
            className="border-0 block shrink-0"
            style={{ width: previewWidth, minHeight: 500 }}
            sandbox="allow-same-origin"
            title={`${label} theme email preview`}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-muted-foreground">Compiling…</span>
          </div>
        )}
      </div>
    </div>
  )
}
