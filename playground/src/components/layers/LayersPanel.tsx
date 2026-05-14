import { useEmailStore } from '@/store/email-store'
import { componentRegistry } from '@/lib/component-registry'
import { getIcon } from '@/lib/icon-lookup'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Layers,
} from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { EmailComponent } from '@/types/email'

function LayerItem({
  component,
  depth = 0,
}: {
  component: EmailComponent
  depth?: number
}) {
  const {
    selectedId,
    selectComponent,
    removeComponent,
    duplicateComponent,
    hiddenIds,
    toggleHidden,
  } = useEmailStore()
  const [expanded, setExpanded] = useState(true)
  const isSelected = selectedId === component.id
  const isHidden = hiddenIds.has(component.id)
  const def = componentRegistry[component.type]
  const IconComponent = def ? getIcon(def.icon) : null
  const hasChildren = component.children && component.children.length > 0

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 h-7 text-xs cursor-pointer transition-colors rounded-md mx-1',
          isSelected
            ? 'bg-accent text-accent-foreground'
            : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground',
          isHidden && 'opacity-50',
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={() => selectComponent(component.id)}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-accent rounded shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
          >
            <ChevronRight
              className={cn(
                'h-3 w-3 transition-transform duration-150',
                expanded && 'rotate-90',
              )}
            />
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Icon */}
        {IconComponent && (
          <IconComponent className="h-3 w-3 shrink-0" />
        )}

        {/* Label */}
        <span className="flex-1 truncate text-[11px] font-medium">
          {def?.label || component.type}
        </span>

        {/* Actions (visible on hover) */}
        <div className="hidden group-hover:flex items-center gap-0.5 pr-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation()
              toggleHidden(component.id)
            }}
          >
            {isHidden ? (
              <EyeOff className="h-2.5 w-2.5" />
            ) : (
              <Eye className="h-2.5 w-2.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation()
              duplicateComponent(component.id)
            }}
          >
            <Copy className="h-2.5 w-2.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-5 w-5 hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation()
              removeComponent(component.id)
            }}
          >
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>

      {/* Children */}
      <AnimatePresence initial={false}>
        {hasChildren && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {component.children!.map((child) => (
              <LayerItem
                key={child.id}
                component={child}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function LayersPanel() {
  const { components } = useEmailStore()

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="py-1">
          {components.length > 0 ? (
            components.map((comp) => (
              <LayerItem key={comp.id} component={comp} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Layers className="h-8 w-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground/60">No layers yet</p>
              <p className="text-xs text-muted-foreground/40 mt-1">
                Drag components to the canvas to see them here
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
