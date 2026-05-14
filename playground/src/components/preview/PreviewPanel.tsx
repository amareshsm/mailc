import { useEffect, useState, useRef } from 'react'
import { useEmailStore } from '@/store/email-store'
import { Monitor, Smartphone, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { compileMailc } from '@/lib/mailc-generator'

// ── Single email preview iframe ────────────────────────────────────────────

function EmailIframe({ html, title }: { html: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !html) return
    const doc = iframe.contentDocument
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()
    }
  }, [html])

  return (
    <iframe
      ref={iframeRef}
      title={title}
      className="w-full border-0"
      style={{ minHeight: '500px', height: '100%' }}
    />
  )
}

// ── Main PreviewPanel ──────────────────────────────────────────────────────

export function PreviewPanel() {
  const { components, viewportMode, setViewportMode, customWidth, setCustomWidth } = useEmailStore()

  const [mailcHtml, setMailcHtml] = useState('')
  const [mailcError, setMailcError] = useState<string | null>(null)

  useEffect(() => {
    async function render() {
      try {
        const html = await compileMailc(components)
        setMailcHtml(html)
        setMailcError(null)
      } catch (err) {
        setMailcError(String(err))
      }
    }
    render()
  }, [components])

  const viewportWidth = viewportMode === 'desktop' ? 600 : viewportMode === 'mobile' ? 375 : customWidth

  const viewports = [
    { mode: 'desktop' as const, icon: Monitor, label: 'Desktop' },
    { mode: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
    { mode: 'custom' as const, icon: ScanLine, label: 'Custom' },
  ]

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Viewport toolbar */}
      <div className="border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5">
          {viewports.map(({ mode, icon: Icon, label }) => (
            <Button
              key={mode}
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 px-3 text-xs gap-1.5',
                viewportMode === mode && 'bg-background text-foreground shadow-sm'
              )}
              onClick={() => setViewportMode(mode)}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </div>

        {viewportMode === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={280}
              max={800}
              value={customWidth}
              onChange={(e) => setCustomWidth(Number(e.target.value))}
              className="w-24 accent-foreground"
            />
            <span className="text-xs text-muted-foreground font-mono w-12">{customWidth}px</span>
          </div>
        )}

        <span className="text-[11px] text-muted-foreground font-mono">{viewportWidth}px</span>
      </div>

      {/* Preview area */}
      <div className="flex-1 dot-grid-bg overflow-auto flex justify-center p-6">
        <div className="flex flex-col gap-2 min-w-0 w-full max-w-160">
          {mailcError ? (
            <div className="text-red-400 text-xs p-3 bg-red-950/20 border border-red-800/30 rounded-lg">{mailcError}</div>
          ) : (
            <motion.div
              animate={{ width: viewportWidth }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative bg-white rounded-lg shadow-2xl shadow-black/30 overflow-hidden h-fit mx-auto"
            >
              <EmailIframe html={mailcHtml} title="mailc Email Preview" />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
