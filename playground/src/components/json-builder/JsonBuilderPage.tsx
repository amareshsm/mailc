/**
 * JsonBuilderPage — three-column layout for the JSON email builder.
 *
 * Layout: [Sidebar 220px | border-r] [Canvas flex-1] [Right panel 380px | border-l]
 *
 * Mounts useJsonCompilation() for auto-recompile on every store change (300ms debounce).
 * Loads a sample email on first mount so there's something to show.
 */

import { useEffect } from 'react'
import { DndContext } from '@dnd-kit/core'
import { useJsonBuilderStore } from '@/store/json-builder-store'
import { useJsonCompilation } from '@/hooks/useJsonCompilation'
import { JsonSidebar } from './JsonSidebar'
import { JsonCanvas } from './JsonCanvas'
import { JsonInspector } from './JsonInspector'
import { JsonPreviewPanel } from './panels/JsonPreviewPanel'
import { JsonStructurePanel } from './panels/JsonStructurePanel'
import { JsonHtmlPanel } from './panels/JsonHtmlPanel'
import { JsonThemePanel } from './panels/JsonThemePanel'
import { JsonDataPanel } from './panels/JsonDataPanel'
import { JsonSourceMapPanel } from './panels/JsonSourceMapPanel'
import { cn } from '@/lib/utils'
import type { ActiveTab } from '@/store/json-builder-store'

type TabDef = {
  id: ActiveTab
  label: string
  requiresSelection?: boolean
}

const TABS: TabDef[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'json', label: 'JSON' },
  { id: 'html', label: 'HTML' },
  { id: 'sourcemap', label: 'Source Map' },
  { id: 'theme', label: 'Theme' },
  { id: 'data', label: 'Data' },
]

function RightPanel() {
  const activeTab = useJsonBuilderStore((s) => s.activeTab)
  const setActiveTab = useJsonBuilderStore((s) => s.setActiveTab)
  const selectedId = useJsonBuilderStore((s) => s.selectedId)
  const compiledErrors = useJsonBuilderStore((s) => s.compiledErrors)
  const compiledWarnings = useJsonBuilderStore((s) => s.compiledWarnings)

  // When a node is selected, auto-switch to inspector tab
  useEffect(() => {
    if (selectedId) {
      // Don't auto-switch if user is on theme/data/sourcemap panels
      setActiveTab('preview')
    }
  }, [selectedId])

  return (
    <div className="w-[380px] border-l border-border flex flex-col bg-card shrink-0">
      {/* Tab strip */}
      <div className="flex items-center border-b border-border px-1 shrink-0 overflow-x-auto">
        {/* Inspector tab — only shown when a node is selected */}
        {selectedId && (
          <TabButton
            active={false}
            label="Inspector"
            onClick={() => {}}
            badge={undefined}
            isInspector
          />
        )}

        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            label={tab.label}
            onClick={() => setActiveTab(tab.id)}
            badge={
              tab.id === 'preview' && (compiledErrors.length > 0 || compiledWarnings.length > 0)
                ? compiledErrors.length + compiledWarnings.length
                : undefined
            }
          />
        ))}
      </div>

      {/* Inspector panel — shown alongside any tab when a node is selected */}
      {selectedId && (
        <div
          className={cn(
            'border-b border-border',
            // Show inspector as a compact panel above the active tab
            'max-h-[400px] overflow-hidden'
          )}
        >
          <JsonInspector />
        </div>
      )}

      {/* Active panel */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' && <JsonPreviewPanel />}
        {activeTab === 'json' && <JsonStructurePanel />}
        {activeTab === 'html' && <JsonHtmlPanel />}
        {activeTab === 'sourcemap' && <JsonSourceMapPanel />}
        {activeTab === 'theme' && <JsonThemePanel />}
        {activeTab === 'data' && <JsonDataPanel />}
      </div>
    </div>
  )
}

function TabButton({
  active,
  label,
  onClick,
  badge,
  isInspector,
}: {
  active: boolean
  label: string
  onClick: () => void
  badge?: number
  isInspector?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1 px-2.5 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
        active
          ? 'border-foreground text-foreground'
          : isInspector
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="inline-flex items-center justify-center h-3.5 min-w-[14px] px-0.5 text-[9px] font-bold rounded-full bg-red-500 text-white">
          {badge}
        </span>
      )}
    </button>
  )
}

export function JsonBuilderPage() {
  // Wire auto-compilation
  useJsonCompilation()

  // Load sample email on first mount
  const loadSampleEmail = useJsonBuilderStore((s) => s.loadSampleEmail)
  const nodes = useJsonBuilderStore((s) => s.nodes)

  useEffect(() => {
    if (nodes.length === 0) {
      loadSampleEmail()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Outer DndContext wraps both sidebar (drag sources) and canvas (drop targets) */}
      <DndContext>
        {/* Left sidebar */}
        <JsonSidebar />

        {/* Center canvas */}
        <div className="flex-1 overflow-hidden">
          <JsonCanvas />
        </div>

        {/* Right panel */}
        <RightPanel />
      </DndContext>
    </div>
  )
}
