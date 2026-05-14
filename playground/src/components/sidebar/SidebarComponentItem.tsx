import { useDraggable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import type { ComponentDefinition } from '@/types/email'
import { cn } from '@/lib/utils'
import { getIcon } from '@/lib/icon-lookup'

interface SidebarComponentItemProps {
  definition: ComponentDefinition
}

export function SidebarComponentItem({ definition }: SidebarComponentItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-${definition.type}`,
    data: {
      type: 'sidebar-component',
      componentType: definition.type,
    },
  })

  const IconComponent = getIcon(definition.icon)

  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 cursor-grab select-none transition-colors hover:bg-surface-hover hover:border-muted-foreground/20',
        isDragging && 'opacity-40 ring-1 ring-ring'
      )}
    >
      {IconComponent && (
        <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <span className="text-sm text-foreground/80">{definition.label}</span>
    </motion.div>
  )
}
