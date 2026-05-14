/**
 * Data tab — JSON editor for the active template's data context. Reads via
 * the playground context so it works for both markup and JSON variants.
 */
import { JsonEditor } from '@visual-json/react'
import type { JsonValue } from '@visual-json/core'
import { useVjTheme } from '@/lib/vj-theme'
import { usePlayground } from '../playground-context'

export function DataTab() {
  const { useStore } = usePlayground()
  const templateData = useStore((s) => s.templateData)
  const setTemplateData = useStore((s) => s.setTemplateData)
  const vjTheme = useVjTheme()

  return (
    <div className="h-full flex flex-col overflow-hidden bg-card">
      <div className="flex-1 min-h-0">
        <JsonEditor
          value={templateData as JsonValue}
          onChange={(val) => setTemplateData((val ?? {}) as Record<string, unknown>)}
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
