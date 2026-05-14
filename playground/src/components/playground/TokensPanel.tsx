/**
 * TokensPanel — brand-token editor for the playground's right column.
 *
 * Visible only when the active template's category is `'theme-class'`. The
 * surrounding `PlaygroundPage` swaps this in for the source-map inspector
 * via the `inspectorTab` store field.
 *
 * Edits flow live: every hex change updates `usePlaygroundStore.tokens`,
 * the compile hook depends on that field, recompiles on every keystroke,
 * and the preview reflects the change.
 */
import { useCallback } from 'react'
import { RotateCcw } from 'lucide-react'
import { usePlaygroundStore } from '@/store/playground-store'
import {
  CLASS_TOKEN_SECTIONS,
  DEFAULT_CLASS_HEX,
  type ClassToken,
} from '@/lib/class-brand-tokens'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Token row — color swatch + label + hex input
// ---------------------------------------------------------------------------

interface TokenRowProps {
  token: ClassToken
  onHexChange: (hex: string) => void
  isOverridden: boolean
}

function TokenRow({ token, onHexChange, isOverridden }: TokenRowProps) {
  const handleHexInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      // Accept any input — the validity check is "starts with #, 4 or 7 chars"
      // but we let the user type freely. Compile will simply use the latest.
      onHexChange(value)
    },
    [onHexChange],
  )

  const handleColorPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onHexChange(e.target.value)
    },
    [onHexChange],
  )

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface/50">
      {/* Color swatch — also a native color picker */}
      <label
        className="relative h-5 w-5 rounded border border-border shrink-0 cursor-pointer overflow-hidden"
        style={{ backgroundColor: token.hex }}
        title={`Pick color for ${token.label}`}
      >
        <input
          type="color"
          value={token.hex}
          onChange={handleColorPick}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>

      {/* Label + class hint */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-foreground truncate">
            {token.label}
          </span>
          {isOverridden && (
            <span
              className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0"
              title="Overridden — differs from default"
            />
          )}
        </div>
        <code className="text-[9px] font-mono text-muted-foreground/70 truncate block">
          {token.exampleClass}
        </code>
      </div>

      {/* Hex input */}
      <input
        type="text"
        value={token.hex}
        onChange={handleHexInput}
        className={cn(
          'w-[68px] px-1.5 py-0.5 text-[10px] font-mono bg-surface border border-border rounded',
          'text-muted-foreground hover:text-foreground focus:text-foreground focus:outline-none focus:border-blue-400',
        )}
        spellCheck={false}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function TokensPanel() {
  const tokens = usePlaygroundStore((s) => s.tokens)
  const setTokenHex = usePlaygroundStore((s) => s.setTokenHex)
  const resetTokens = usePlaygroundStore((s) => s.resetTokens)

  const overrideCount = tokens.filter((t) => {
    const def = DEFAULT_CLASS_HEX[t.id]
    return def !== undefined && t.hex.toLowerCase() !== def.toLowerCase()
  }).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-card shrink-0 flex items-center gap-2">
        <span className="text-xs font-semibold text-foreground">Brand Tokens</span>
        {overrideCount > 0 && (
          <span className="text-[10px] text-blue-500">
            {overrideCount} edit{overrideCount === 1 ? '' : 's'}
          </span>
        )}
        <button
          onClick={resetTokens}
          disabled={overrideCount === 0}
          title="Reset all tokens to defaults"
          className={cn(
            'ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors',
            overrideCount === 0
              ? 'text-muted-foreground/40 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface',
          )}
        >
          <RotateCcw className="h-2.5 w-2.5" />
          Reset
        </button>
      </div>

      {/* Hint */}
      <div className="px-3 py-1.5 bg-surface/40 border-b border-border shrink-0">
        <p className="text-[10px] text-muted-foreground/70 leading-snug">
          Edit any hex to recolor the preview live. Brand-token classes
          (<code className="font-mono">bg-brand</code>, etc.) in the template
          resolve to these values at compile time.
        </p>
      </div>

      {/* Tokens grouped by section */}
      <div className="flex-1 overflow-y-auto py-1">
        {CLASS_TOKEN_SECTIONS.map((section) => {
          const sectionTokens = tokens.filter((t) => t.section === section)
          if (sectionTokens.length === 0) return null
          return (
            <div key={section} className="pt-1">
              <div className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section}
              </div>
              {sectionTokens.map((token) => {
                const def = DEFAULT_CLASS_HEX[token.id]
                const isOverridden =
                  def !== undefined && token.hex.toLowerCase() !== def.toLowerCase()
                return (
                  <TokenRow
                    key={token.id}
                    token={token}
                    onHexChange={(hex) => setTokenHex(token.id, hex)}
                    isOverridden={isOverridden}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
