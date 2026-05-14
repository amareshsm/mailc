import { useEmailStore } from '@/store/email-store'
import { attributeDefinitions, componentRegistry } from '@/lib/component-registry'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Settings2, Trash2, Copy } from 'lucide-react'
import { getIcon } from '@/lib/icon-lookup'
import { motion, AnimatePresence } from 'framer-motion'
import type { AttributeDefinition } from '@/types/email'

function PropertyInput({
  attr,
  value,
  onChange,
}: {
  attr: AttributeDefinition
  value: string
  onChange: (val: string) => void
}) {
  if (attr.type === 'color') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={attr.placeholder}
          className="flex-1 h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    )
  }

  if (attr.type === 'select') {
    return (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {attr.options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt || '(none)'}
          </option>
        ))}
      </select>
    )
  }

  if (attr.type === 'textarea') {
    return (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={attr.placeholder}
        rows={3}
        className="w-full rounded-md border border-border bg-surface px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
      />
    )
  }

  return (
    <input
      type={attr.type === 'url' ? 'url' : 'text'}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={attr.placeholder}
      className="w-full h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
    />
  )
}

export function PropertiesPanel() {
  const {
    selectedId,
    components,
    updateComponentAttributes,
    updateComponentContent,
    removeComponent,
    duplicateComponent,
  } = useEmailStore()

  const findComponent = (
    comps: typeof components,
    id: string
  ): (typeof components)[number] | null => {
    for (const c of comps) {
      if (c.id === id) return c
      if (c.children) {
        const found = findComponent(c.children, id)
        if (found) return found
      }
    }
    return null
  }

  const selected = selectedId ? findComponent(components, selectedId) : null
  const def = selected ? componentRegistry[selected.type] : null
  const attrs = selected ? attributeDefinitions[selected.type] || [] : []

  const IconComponent = def ? getIcon(def.icon) : null

  return (
    <ScrollArea className="flex-1 h-full">
      <AnimatePresence mode="wait">
        {selected && def ? (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="p-3"
          >
            {/* Component header */}
            <div className="flex items-center gap-2 mb-3">
              {IconComponent && (
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{def.label}</span>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => duplicateComponent(selected.id)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hover:text-red-400"
                  onClick={() => removeComponent(selected.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <Separator className="mb-3" />

            {/* Properties form */}
            <div className="space-y-3">
              {attrs.map((attr) => {
                const isContent = attr.key === 'content'
                const value = isContent
                  ? selected.content || ''
                  : selected.attributes[attr.key] || ''

                return (
                  <div key={attr.key}>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                      {attr.label}
                    </label>
                    <PropertyInput
                      attr={attr}
                      value={value}
                      onChange={(val) => {
                        if (isContent) {
                          updateComponentContent(selected.id, val)
                        } else {
                          updateComponentAttributes(selected.id, {
                            [attr.key]: val,
                          })
                        }
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 px-4 text-center"
          >
            <Settings2 className="h-8 w-8 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground/60">Select a component</p>
            <p className="text-xs text-muted-foreground/40 mt-1">
              Click on any component in the canvas to edit its properties
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </ScrollArea>
  )
}
