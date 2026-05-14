import { useState, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Monitor, Smartphone, SlidersHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'
import { CodeBlock } from '@/components/ui/code-block'

export interface ViewTab {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface EmailPreviewPanelProps {
  tabs: ViewTab[]
  html: string
  error?: string | null
  compileTimeMs?: number
  getTabContent: (tabId: string) => string
  emptyMessage?: string
  className?: string
  layoutId?: string
}

const MIN_WIDTH = 300
const MAX_WIDTH = 900
const DESKTOP_WIDTH = 600
const MOBILE_WIDTH = 375

export function EmailPreviewPanel({
  tabs,
  html,
  error,
  compileTimeMs,
  getTabContent,
  emptyMessage = 'No content to display',
  className,
  layoutId = 'emailPreviewTab',
}: EmailPreviewPanelProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? 'preview')
  const [viewportMode, setViewportModeRaw] = useState<'desktop' | 'mobile' | 'custom'>('desktop')
  const [previewWidth, setPreviewWidth] = useState(DESKTOP_WIDTH)

  // Ref-driven resize: DOM is updated directly during drag to avoid React
  // re-renders on every mousemove (which causes iframe jank).
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const liveWidth = useRef(DESKTOP_WIDTH)
  const isDragging = useRef(false)
  const dragSide = useRef<'left' | 'right'>('right')
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(DESKTOP_WIDTH)

  const applyWidth = (w: number) => {
    liveWidth.current = w
    if (iframeRef.current) iframeRef.current.style.width = `${w}px`
  }

  const setViewportMode = (mode: 'desktop' | 'mobile' | 'custom') => {
    setViewportModeRaw(mode)
    if (mode === 'desktop') {
      setPreviewWidth(DESKTOP_WIDTH)
      applyWidth(DESKTOP_WIDTH)
    } else if (mode === 'mobile') {
      setPreviewWidth(MOBILE_WIDTH)
      applyWidth(MOBILE_WIDTH)
    }
  }

  const handleDragStart = (e: React.MouseEvent, side: 'left' | 'right') => {
    isDragging.current = true
    dragSide.current = side
    dragStartX.current = e.clientX
    dragStartWidth.current = liveWidth.current
    e.preventDefault()
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    // Prevent the iframe from swallowing mouse events during drag — without
    // this, mousemove stops firing the moment the cursor enters the iframe.
    if (iframeRef.current) iframeRef.current.style.pointerEvents = 'none'
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = e.clientX - dragStartX.current
      const newWidth =
        dragSide.current === 'right'
          ? dragStartWidth.current + delta
          : dragStartWidth.current - delta
      const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth))
      // Update DOM directly — zero React re-renders while dragging
      applyWidth(clamped)
    }
    const onMouseUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (iframeRef.current) iframeRef.current.style.pointerEvents = ''
      // Commit to state once on release (single re-render)
      setPreviewWidth(liveWidth.current)
      setViewportModeRaw('custom')
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const isPreviewTab = activeTab === 'preview'
  const isEmpty = !html && !error
  const showMultipleTabs = tabs.length > 1
  const iframeContent = useMemo(() => html, [html])

  return (
    <div className={cn('flex-1 flex flex-col overflow-hidden bg-background min-w-0 min-h-0', className)}>
      {/* Toolbar */}
      <div className="h-10 border-b border-border bg-card flex items-center justify-between px-3 shrink-0">
        {/* Left: tabs or title */}
        {showMultipleTabs ? (
          <div className="flex items-center gap-0.5 bg-surface rounded-md p-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-colors z-10',
                    activeTab === tab.id
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId={layoutId}
                      className="absolute inset-0 bg-background rounded shadow-sm"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className="h-3 w-3 relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">
              {tabs[0]?.label ?? 'Preview'}
            </span>
            {compileTimeMs != null && compileTimeMs > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground bg-surface px-1.5 py-0.5 rounded">
                {compileTimeMs}ms
              </span>
            )}
          </div>
        )}

        {/* Right: compile time + viewport controls */}
        <div className="flex items-center gap-2">
          {showMultipleTabs && compileTimeMs != null && compileTimeMs > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono">{compileTimeMs}ms</span>
          )}
          {isPreviewTab && (
            <div className="flex items-center gap-0.5 bg-surface rounded-md p-0.5">
              <button
                onClick={() => setViewportMode('desktop')}
                className={cn(
                  'p-1 rounded transition-colors',
                  viewportMode === 'desktop'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Desktop (600px)"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewportMode('mobile')}
                className={cn(
                  'p-1 rounded transition-colors',
                  viewportMode === 'mobile'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Mobile (375px)"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewportMode('custom')}
                className={cn(
                  'p-1 rounded transition-colors',
                  viewportMode === 'custom'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Custom width"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
              {viewportMode === 'custom' && (
                <input
                  type="number"
                  value={previewWidth}
                  onChange={(e) => {
                    const v = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Number(e.target.value)))
                    setPreviewWidth(v)
                    applyWidth(v)
                  }}
                  className="w-14 h-6 text-[11px] text-center bg-background border border-border rounded px-1"
                  min={MIN_WIDTH}
                  max={MAX_WIDTH}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-4">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-muted-foreground text-sm">{emptyMessage}</span>
          </div>
        ) : error ? (
          <CompileErrorCard error={error} />
        ) : isPreviewTab ? (
          <div className="flex items-start justify-center min-h-full">
            <ResizeHandle side="left" onMouseDown={handleDragStart} />
            <iframe
              ref={iframeRef}
              srcDoc={iframeContent}
              className="border-0 bg-white block shrink-0"
              style={{ width: previewWidth, minHeight: '500px' }}
              sandbox="allow-same-origin"
              title="Email preview"
            />
            <ResizeHandle side="right" onMouseDown={handleDragStart} />
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <CodeBlock
              code={getTabContent(activeTab) || 'No output yet'}
              language={activeTab === 'json' ? 'json' : 'markup'}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ResizeHandle({
  side,
  onMouseDown,
}: {
  side: 'left' | 'right'
  onMouseDown: (e: React.MouseEvent, side: 'left' | 'right') => void
}) {
  return (
    <div
      className="self-start sticky top-[calc(50vh-60px)] w-5 shrink-0 flex items-center justify-center h-10 cursor-col-resize group select-none z-10"
      onMouseDown={(e) => onMouseDown(e, side)}
    >
      <div className="w-[3px] h-10 rounded-full bg-border/60 group-hover:bg-blue-500/70 transition-colors duration-150" />
    </div>
  )
}

function CompileErrorCard({ error }: { error: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/60 rounded-xl p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
          <span className="text-red-500 text-sm">✕</span>
        </div>
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Compile Error</p>
      </div>
      <div className="space-y-1.5">
        {error.split('\n').filter(Boolean).map((line, i) => (
          <div
            key={i}
            className="flex items-start gap-2 text-xs text-red-600 dark:text-red-300 font-mono bg-red-100/60 dark:bg-red-900/30 rounded-md px-3 py-2 leading-relaxed"
          >
            <span className="text-red-400 dark:text-red-500 shrink-0 mt-px select-none">→</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
