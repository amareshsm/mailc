/**
 * Inspector panel — shows editable fields for the selected node.
 *
 * Fields come from MC_FIELD_DEFS in the MC component registry.
 *
 * GAP: No color picker for class mode. Colors are applied via Tailwind
 * class names (e.g. text-red-500, bg-blue-600) rather than inline
 * color= attributes, which would trigger CSS_ATTR_IN_CLASS_MODE errors.
 */

import { useJsonBuilderStore } from '@/store/json-builder-store'
import { MC_FIELD_DEFS } from '@/lib/mc-component-registry'
import { Trash2, Tag, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ClassModeNote() {
  return (
    <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2.5 text-xs mt-1">
      <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
        <Info className="h-3 w-3" />
        Class Mode
      </div>
      <p className="text-amber-600 dark:text-amber-300 leading-relaxed">
        Colors must be Tailwind classes (e.g.{' '}
        <code className="bg-amber-100 dark:bg-amber-900 px-0.5 rounded">text-brand</code>,{' '}
        <code className="bg-amber-100 dark:bg-amber-900 px-0.5 rounded">bg-blue-600</code>), NOT
        hex values. Hex values in class= will be ignored. Use the Theme tab to define custom color
        tokens.
      </p>
    </div>
  )
}

interface FieldProps {
  label: string
  help?: string
  children: React.ReactNode
}

function Field({ label, help, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {children}
      {help && <p className="text-[11px] text-muted-foreground leading-relaxed">{help}</p>}
    </div>
  )
}

export function JsonInspector() {
  const selectedId = useJsonBuilderStore((s) => s.selectedId)
  const getSelectedNode = useJsonBuilderStore((s) => s.getSelectedNode)
  const updateNodeAttributes = useJsonBuilderStore((s) => s.updateNodeAttributes)
  const updateNodeContent = useJsonBuilderStore((s) => s.updateNodeContent)
  const removeNode = useJsonBuilderStore((s) => s.removeNode)

  const node = getSelectedNode()

  if (!selectedId || !node) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-4">
        <Tag className="h-8 w-8 opacity-30" />
        <p className="text-sm text-center">Select a node on the canvas to inspect its properties</p>
      </div>
    )
  }

  const fields = MC_FIELD_DEFS[node.type] ?? []

  const handleAttrChange = (key: string, value: string) => {
    updateNodeAttributes(node.id!, { [key]: value })
  }

  const handleContentChange = (value: string) => {
    updateNodeContent(node.id!, value)
  }

  const handleDelete = () => {
    removeNode(node.id!)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Node type badge */}
      <div className="px-3 py-2.5 border-b border-border shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {node.type}
          </span>
          {node.id && (
            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">
              {node.id}
            </span>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">No editable fields for this component.</p>
        ) : (
          fields.map((field) => {
            const value =
              field.key === 'content'
                ? node.content ?? ''
                : node.attributes?.[field.key] ?? ''

            return (
              <Field key={field.key} label={field.label} help={field.type !== 'class' ? field.help : undefined}>
                {field.key === 'content' && field.type === 'textarea' ? (
                  <textarea
                    value={value}
                    onChange={(e) => handleContentChange(e.target.value)}
                    rows={4}
                    placeholder={field.placeholder}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                ) : field.type === 'class' ? (
                  <>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleAttrChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full h-7 rounded border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <ClassModeNote />
                    {field.help && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{field.help}</p>
                    )}
                  </>
                ) : (
                  <input
                    type={field.type === 'url' ? 'url' : 'text'}
                    value={value}
                    onChange={(e) =>
                      field.key === 'content'
                        ? handleContentChange(e.target.value)
                        : handleAttrChange(field.key, e.target.value)
                    }
                    placeholder={field.placeholder}
                    className="w-full h-7 rounded border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                )}
              </Field>
            )
          })
        )}
      </div>

      {/* Delete button */}
      <div className="px-3 py-2.5 border-t border-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete {node.type}
        </Button>
      </div>
    </div>
  )
}
