import { useEffect, useState, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { html } from '@codemirror/lang-html'
import { useEmailStore } from '@/store/email-store'
import { useThemeStore } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Copy, Check } from 'lucide-react'
import { EditorView } from '@codemirror/view'
import { generateMailcMarkup, compileMailc } from '@/lib/mailc-generator'

// ── CodeMirror themes ──────────────────────────────────────────────────────

const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#09090b',
    color: '#d4d4d8',
    fontSize: '13px',
  },
  '.cm-gutters': {
    backgroundColor: '#09090b',
    color: '#3f3f46',
    borderRight: '1px solid #27272a',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#18181b',
  },
  '.cm-activeLine': {
    backgroundColor: '#18181b40',
  },
  '.cm-selectionBackground': {
    backgroundColor: '#27272a !important',
  },
  '.cm-cursor': {
    borderLeftColor: '#d4d4d8',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: '#27272a !important',
  },
})

const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#18181b',
    fontSize: '13px',
  },
  '.cm-gutters': {
    backgroundColor: '#f8f8fa',
    color: '#a1a1aa',
    borderRight: '1px solid #e4e4e7',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f0f0f2',
  },
  '.cm-activeLine': {
    backgroundColor: '#f4f4f540',
  },
  '.cm-selectionBackground': {
    backgroundColor: '#d4d4d8 !important',
  },
  '.cm-cursor': {
    borderLeftColor: '#18181b',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: '#d4d4d8 !important',
  },
})

// ── Main CodePanel ─────────────────────────────────────────────────────────

type PaneMode = 'markup' | 'html'

export function CodePanel() {
  const { components } = useEmailStore()
  const { theme } = useThemeStore()
  const isDark = theme === 'dark'

  const mailcMarkup = useMemo(() => generateMailcMarkup(components), [components])
  const [mailcHtml, setMailcHtml] = useState('')
  const [mode, setMode] = useState<PaneMode>('markup')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function render() {
      const html = await compileMailc(components)
      setMailcHtml(html)
    }
    render()
  }, [components])

  const code = mode === 'markup' ? mailcMarkup : mailcHtml

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-border px-3 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-surface rounded-md p-0.5">
            {(['markup', 'html'] as const).map((m) => (
              <Button
                key={m}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 px-2.5 text-[11px] uppercase font-mono',
                  mode === m && 'bg-background text-foreground shadow-sm'
                )}
                onClick={() => setMode(m)}
              >
                {m}
              </Button>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[11px] gap-1"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <CodeMirror
          key={`${theme}-${mode}`}
          value={code}
          height="100%"
          extensions={[html()]}
          theme={isDark ? darkTheme : lightTheme}
          readOnly
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
          }}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  )
}
