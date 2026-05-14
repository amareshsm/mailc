import { useSandboxStore, type CodeFormat } from '@/store/sandbox-store'
import { JsonEditor } from '@visual-json/react'
import type { JsonValue } from '@visual-json/core'
import { useVjTheme } from '@/lib/vj-theme'
import { CodeEditor } from '@/components/ui/CodeEditor'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Code2, Braces } from 'lucide-react'

const FORMAT_TABS: { id: CodeFormat; label: string; icon: typeof Code2 }[] = [
  { id: 'markup', label: 'mailc', icon: Code2 },
  { id: 'json', label: 'JSON', icon: Braces },
]

export function SandboxCodeEditor() {
  const {
    markupCode,
    jsonCode,
    format,
    highlightedMarkupLine,
    highlightedMarkupVersion,
    setMarkupCode,
    setJsonCode,
    setFormat,
  } =
    useSandboxStore()
  const vjTheme = useVjTheme()

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Format tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-0.5 bg-surface rounded-lg p-0.5">
          {FORMAT_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = format === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setFormat(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
              </button>
            )
          })}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-muted-foreground">
            {format === 'markup' ? '.mc' : '.json'}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded cursor-default select-none">
                class
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Styling mode: class — use Tailwind class="…" on mc-* components. CSS-property attributes like color="red" produce errors here.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Editor area */}
      {format === 'markup' ? (
        <div className="flex-1 overflow-hidden min-h-0">
          <CodeEditor
            language="xml"
            value={markupCode}
            onChange={setMarkupCode}
            highlightLines={
              highlightedMarkupLine
                ? { start: highlightedMarkupLine, end: highlightedMarkupLine }
                : null
            }
            highlightTrigger={highlightedMarkupVersion}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <JsonEditor
            value={safeParseJson(jsonCode)}
            onChange={(val) => setJsonCode(JSON.stringify(val, null, 2))}
            height="100%"
            style={vjTheme}
            treeShowValues
            editorShowDescriptions={false}
            sidebarOpen={false}
          />
        </div>
      )}
    </div>
  )
}

function safeParseJson(str: string): JsonValue {
  try {
    return JSON.parse(str) as JsonValue
  } catch {
    return {} as JsonValue
  }
}
