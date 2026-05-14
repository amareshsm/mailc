import { useDynamicEmailsStore } from '@/store/dynamic-emails-store'
import { JsonEditor } from '@visual-json/react'
import type { JsonValue } from '@visual-json/core'
import { RotateCcw } from 'lucide-react'
import { useVjTheme } from '@/lib/vj-theme'

export function DynamicDataEditor() {
  const { templates, selectedTemplateId, templateData, setTemplateData, resetTemplateData } =
    useDynamicEmailsStore()
  const vjTheme = useVjTheme()
  const template = templates.find((t) => t.id === selectedTemplateId)
  if (!template) return null

  const currentData = templateData[template.id] ?? template.defaultData

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Template Data
        </h3>
        <button
          onClick={() => resetTemplateData(template.id)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          title="Reset to defaults"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <JsonEditor
          value={currentData as JsonValue}
          onChange={(val) => setTemplateData(template.id, val as Record<string, unknown>)}
          height="100%"
          style={vjTheme}
          treeShowValues
          editorShowDescriptions={false}
          sidebarOpen={false}
        />
      </div>
    </div>
  )
}
