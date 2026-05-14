import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface DropZoneProps {
  id: string
  parentId?: string
  index: number
  label?: string
  compact?: boolean
  isDragging?: boolean
  isEmpty?: boolean
}

export function DropZone({
  id,
  label = 'Drop here',
  compact = false,
  isDragging = false,
  isEmpty = false,
}: DropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id })

  // Always render a real hit area. During drag, expand it so it's easy to target.
  const showLabel = isOver || (isDragging && isEmpty)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative w-full transition-all duration-150',
        // Baseline size — always a real target
        compact ? 'h-2' : 'h-3',
        // Expand when something is being dragged over the whole canvas
        isDragging && !compact && 'h-8',
        isDragging && compact && 'h-5',
        // Expand MORE when the pointer is directly over this zone
        isOver && 'h-14',
      )}
    >
      {/* Visual indicator — shown when over OR when dragging into empty canvas */}
      {(isOver || showLabel) && (
        <div
          className={cn(
            'absolute inset-x-2 inset-y-1 rounded-lg border-2 border-dashed flex items-center justify-center transition-all duration-100',
            isOver
              ? 'border-blue-400 bg-blue-400/10'
              : 'border-zinc-300 bg-zinc-50/50',
          )}
        >
          <span className={cn(
            'text-[11px] font-medium',
            isOver ? 'text-blue-500' : 'text-zinc-400',
          )}>
            {label}
          </span>
        </div>
      )}

      {/* Thin line hint shown during drag even when not over */}
      {isDragging && !isOver && !showLabel && (
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-zinc-200/60" />
      )}
    </div>
  )
}
