/**
 * JsonSidebar — left sidebar for the JSON email builder.
 *
 * Sections:
 * - Components (layout + content) — click to add, draggable
 * - Email Settings — title and preview text inputs
 * - Compile stats — shown at the bottom
 */

import { useDraggable } from '@dnd-kit/core'
import {
  LayoutList,
  Columns2,
  Type,
  MousePointerClick,
  Image,
  Minus,
  Space,
  Clock,
  Cpu,
  FileCode2,
} from 'lucide-react'
import { useJsonBuilderStore } from '@/store/json-builder-store'
import { getMCLayoutComponents, getMCContentComponents } from '@/lib/mc-component-registry'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutList,
  Columns2,
  Type,
  MousePointerClick,
  Image,
  Minus,
  Space,
}

function ComponentItem({ type, label, icon }: { type: string; label: string; icon: string }) {
  const addNode = useJsonBuilderStore((s) => s.addNode)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-${type}`,
    data: { type },
  })

  const Icon = ICON_MAP[icon] ?? LayoutList

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => addNode(type)}
      className={cn(
        'flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-xs font-medium',
        'bg-surface hover:bg-background border border-border hover:border-blue-300',
        'text-muted-foreground hover:text-foreground transition-all cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40'
      )}
      title={`Add ${label}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </button>
  )
}

export function JsonSidebar() {
  const emailTitle = useJsonBuilderStore((s) => s.emailTitle)
  const emailPreview = useJsonBuilderStore((s) => s.emailPreview)
  const setEmailTitle = useJsonBuilderStore((s) => s.setEmailTitle)
  const setEmailPreview = useJsonBuilderStore((s) => s.setEmailPreview)
  const compileStats = useJsonBuilderStore((s) => s.compileStats)
  const compiling = useJsonBuilderStore((s) => s.compiling)

  const layoutComponents = getMCLayoutComponents()
  const contentComponents = getMCContentComponents()

  return (
    <div className="w-[220px] border-r border-border flex flex-col bg-card overflow-y-auto shrink-0">
      {/* Layout components */}
      <div className="p-3 border-b border-border">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Layout
        </p>
        <div className="space-y-1">
          {layoutComponents.map((comp) => (
            <ComponentItem
              key={comp.type}
              type={comp.type}
              label={comp.label}
              icon={comp.icon}
            />
          ))}
        </div>
      </div>

      {/* Content components */}
      <div className="p-3 border-b border-border">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Content
        </p>
        <div className="space-y-1">
          {contentComponents.map((comp) => (
            <ComponentItem
              key={comp.type}
              type={comp.type}
              label={comp.label}
              icon={comp.icon}
            />
          ))}
        </div>
      </div>

      {/* Email Settings */}
      <div className="p-3 border-b border-border">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Email Settings
        </p>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">Title</label>
            <input
              type="text"
              value={emailTitle}
              onChange={(e) => setEmailTitle(e.target.value)}
              placeholder="Email subject line"
              className="w-full h-7 px-2 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">Preview Text</label>
            <input
              type="text"
              value={emailPreview}
              onChange={(e) => setEmailPreview(e.target.value)}
              placeholder="Email preview text…"
              className="w-full h-7 px-2 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Compile stats */}
      <div className="p-3 mt-auto">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Compile Stats
        </p>
        {compiling ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="animate-spin h-3 w-3 rounded-full border border-border border-t-foreground" />
            Compiling…
          </div>
        ) : compileStats ? (
          <div className="space-y-1.5">
            <StatRow
              Icon={Cpu}
              label="Components"
              value={String(compileStats.components)}
            />
            <StatRow
              Icon={Clock}
              label="Compile time"
              value={`${compileStats.compileTime.toFixed(1)} ms`}
            />
            <StatRow
              Icon={FileCode2}
              label="Output size"
              value={`${(compileStats.outputSize / 1024).toFixed(1)} KB`}
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/50">No stats yet</p>
        )}
      </div>
    </div>
  )
}

function StatRow({
  Icon,
  label,
  value,
}: {
  Icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3 w-3 text-muted-foreground/60 shrink-0" />
      <span className="text-muted-foreground flex-1">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  )
}
