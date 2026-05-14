/**
 * Theme panel for the JSON builder.
 *
 * Allows adding custom color tokens that become Tailwind classes.
 * e.g. adding "brand: #e11d48" enables bg-brand, text-brand, border-brand.
 *
 * GAP: In class mode, there is no color picker that maps directly to
 * CSS-property attributes (color=, background-color=). Instead, colors
 * are always Tailwind class references. Custom tokens here extend the
 * theme so user-defined classes like text-brand work in the inspector.
 */

import { useState } from 'react'
import { Plus, Trash2, Palette } from 'lucide-react'
import { useJsonBuilderStore } from '@/store/json-builder-store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DEFAULT_PALETTE_GROUPS = [
  { name: 'gray', shades: ['100', '300', '500', '700', '900'] },
  { name: 'blue', shades: ['100', '300', '500', '600', '700'] },
  { name: 'red', shades: ['100', '300', '500', '600', '700'] },
  { name: 'green', shades: ['100', '300', '500', '600', '700'] },
  { name: 'yellow', shades: ['100', '300', '400', '500', '600'] },
]

export function JsonThemePanel() {
  const themeColors = useJsonBuilderStore((s) => s.themeColors)
  const setThemeColor = useJsonBuilderStore((s) => s.setThemeColor)
  const removeThemeColor = useJsonBuilderStore((s) => s.removeThemeColor)

  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState('#000000')
  const [error, setError] = useState('')

  const handleAdd = () => {
    const name = newName.trim()
    if (!name) {
      setError('Token name is required')
      return
    }
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      setError('Token name must be lowercase letters, numbers, or hyphens')
      return
    }
    setError('')
    setThemeColor(name, newValue)
    setNewName('')
    setNewValue('#000000')
  }

  return (
    <div className="flex flex-col gap-4 p-3 overflow-auto h-full">
      {/* Explanation */}
      <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs">
        <div className="font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" />
          Class Mode Color Tokens
        </div>
        <p className="text-blue-600 dark:text-blue-300 leading-relaxed">
          These become Tailwind classes. Adding{' '}
          <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">brand: &apos;#e11d48&apos;</code>{' '}
          enables{' '}
          <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">bg-brand</code>,{' '}
          <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">text-brand</code>, and{' '}
          <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">border-brand</code> in the
          class input.
        </p>
      </div>

      {/* Existing colors */}
      {Object.keys(themeColors).length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-2">Custom Tokens</p>
          <div className="space-y-1.5">
            {Object.entries(themeColors).map(([name, value]) => (
              <div key={name} className="flex items-center gap-2 group">
                <div
                  className="w-5 h-5 rounded border border-border shrink-0"
                  style={{ backgroundColor: value }}
                />
                <code className="text-xs font-mono flex-1 text-foreground">{name}</code>
                <input
                  type="color"
                  value={value}
                  onChange={(e) => setThemeColor(name, e.target.value)}
                  className="w-8 h-6 cursor-pointer rounded border border-border"
                  title="Edit color"
                />
                <span className="text-xs text-muted-foreground font-mono w-16">{value}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeThemeColor(name)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new color */}
      <div>
        <p className="text-xs font-medium text-foreground mb-2">Add Token</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="brand"
            className={cn(
              'flex-1 h-7 px-2 text-xs rounded border bg-background text-foreground',
              error ? 'border-red-400' : 'border-border'
            )}
          />
          <input
            type="color"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="w-10 h-7 cursor-pointer rounded border border-border"
            title="Pick color"
          />
          <Button size="sm" onClick={handleAdd} className="h-7 px-2">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        {newValue && newName && (
          <p className="text-xs text-muted-foreground mt-1">
            Enables:{' '}
            <code className="bg-surface px-1 rounded">
              bg-{newName} text-{newName} border-{newName}
            </code>
          </p>
        )}
      </div>

      {/* Default palette reference */}
      <div>
        <p className="text-xs font-medium text-foreground mb-2">Available Default Classes</p>
        <div className="space-y-2">
          {DEFAULT_PALETTE_GROUPS.map((group) => (
            <div key={group.name}>
              <p className="text-xs text-muted-foreground mb-1 capitalize">{group.name}</p>
              <div className="flex gap-1 flex-wrap">
                {group.shades.map((shade) => (
                  <code
                    key={shade}
                    className="text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border text-muted-foreground"
                  >
                    {group.name}-{shade}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
