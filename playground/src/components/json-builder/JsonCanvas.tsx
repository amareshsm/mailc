/**
 * JsonCanvas — center canvas showing the email structure as mc-body sections.
 *
 * Uses DndContext from @dnd-kit/core. Sections can be reordered by dragging.
 * Drop zones appear between sections and at the top/bottom.
 * Click any node to select it (delegates to JsonCanvasNode).
 */

import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState } from 'react'
import type { MCNode } from 'mailc'
import { useJsonBuilderStore } from '@/store/json-builder-store'
import { JsonCanvasNode } from './JsonCanvasNode'
import { cn } from '@/lib/utils'
import { LayoutList } from 'lucide-react'

/** Droppable zone between sections. */
function DropZone({
  index,
  isOver,
}: {
  index: number
  isOver: boolean
}) {
  const { setNodeRef } = useDroppable({ id: `drop-${index}` })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'h-1.5 rounded-full mx-2 transition-all',
        isOver ? 'bg-blue-500 h-2' : 'bg-transparent hover:bg-border'
      )}
    />
  )
}

/** Draggable section wrapper. */
function DraggableSection({
  node,
  index,
}: {
  node: MCNode
  index: number
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `section-${node.id}`,
    data: { sectionIndex: index, nodeId: node.id },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn('transition-opacity', isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
    >
      <JsonCanvasNode node={node} />
    </div>
  )
}

export function JsonCanvas() {
  const nodes = useJsonBuilderStore((s) => s.nodes)
  const moveNode = useJsonBuilderStore((s) => s.moveNode)
  const selectNode = useJsonBuilderStore((s) => s.selectNode)

  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [overDropZone, setOverDropZone] = useState<number | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null)
    setOverDropZone(null)

    const { over, active } = event
    if (!over) return

    const overId = String(over.id)
    if (!overId.startsWith('drop-')) return

    const toIndex = parseInt(overId.replace('drop-', ''), 10)
    const fromIndex = active.data.current?.sectionIndex
    if (fromIndex === undefined || fromIndex === toIndex) return

    moveNode(null, fromIndex, null, toIndex)
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-canvas-node]')) return
    selectNode(null)
  }

  const activeSectionNode = activeDragId
    ? nodes.find((n) => `section-${n.id}` === activeDragId)
    : null

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div
        className="flex-1 overflow-auto p-4 bg-surface/30"
        onClick={handleCanvasClick}
      >
        {nodes.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-surface border-2 border-dashed border-border flex items-center justify-center">
              <LayoutList className="h-8 w-8 opacity-30" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Drop components here</p>
              <p className="text-xs mt-1 text-muted-foreground/60">
                Click a component in the sidebar to add it
              </p>
            </div>
          </div>
        ) : (
          /* Sections list with drop zones */
          <div className="max-w-2xl mx-auto space-y-0">
            <DropZone index={0} isOver={overDropZone === 0} />

            {nodes.map((node, index) => (
              <div key={node.id} data-canvas-node>
                <DraggableSection node={node} index={index} />
                <DropZone index={index + 1} isOver={overDropZone === index + 1} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drag overlay — ghost of the dragged section */}
      <DragOverlay>
        {activeSectionNode && (
          <div className="opacity-80 pointer-events-none scale-95 rounded-lg border border-blue-400 shadow-lg bg-background">
            <JsonCanvasNode node={activeSectionNode} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
