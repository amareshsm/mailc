import { useState, useRef, useEffect, useCallback } from 'react'
import { useThemePlaygroundStore, type ConfigTab } from '@/store/theme-playground-store'
import {
  BRAND_SECTIONS,
  TOKEN_CATEGORIES,
  DEFAULT_TOKENS,
  DEFAULT_BRAND_MAPPINGS,
  type ColorToken,
} from '@/lib/brand-tokens'
import { RotateCcw, Plus, X, Copy, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code-block'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// ── Tab button ────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex-1 py-1.5 text-[11px] font-medium rounded transition-colors z-10',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {active && (
        <motion.div
          layoutId="configTab"
          className="absolute inset-0 bg-background rounded shadow-sm"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export function ThemeConfigPanel() {
  const {
    configTab,
    setConfigTab,
    getTokenOverrideCount,
    getMappingOverrideCount,
    resetTokens,
    resetBrandMappings,
  } = useThemePlaygroundStore()

  const tokenOverrides = getTokenOverrideCount()
  const mappingOverrides = getMappingOverrideCount()
  const totalOverrides = tokenOverrides + mappingOverrides

  const handleReset = () => {
    resetTokens()
    resetBrandMappings()
  }

  return (
    <div className="w-[300px] border-l border-border bg-card flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Design System
          </h3>
          {totalOverrides > 0 && (
            <span className="text-[10px] text-blue-500">
              {totalOverrides} override{totalOverrides !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {totalOverrides > 0 && (
          <Button variant="ghost" size="icon-sm" onClick={handleReset} title="Reset all">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-0.5 bg-surface rounded-lg p-0.5">
          {(['tokens', 'branding', 'config'] as ConfigTab[]).map((tab) => (
            <TabBtn key={tab} active={configTab === tab} onClick={() => setConfigTab(tab)}>
              {tab === 'tokens' ? 'Tokens' : tab === 'branding' ? 'Brand' : 'Config'}
            </TabBtn>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {configTab === 'tokens' ? (
          <TokensTab />
        ) : configTab === 'branding' ? (
          <BrandingTab />
        ) : (
          <ConfigTab />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TOKENS TAB — editable color tokens + create new
// ═══════════════════════════════════════════════════════════════════════════

function TokensTab() {
  const { tokens, setTokenHex, addCustomToken, removeCustomToken } = useThemePlaygroundStore()
  const [showNewForm, setShowNewForm] = useState(false)

  return (
    <div className="py-2">
      <div className="px-3 py-1.5 mb-1">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Define your color tokens. These are the building blocks for your brand.
        </p>
      </div>

      {TOKEN_CATEGORIES.map((cat) => {
        const catTokens = tokens.filter((t) => t.category === cat.category)
        if (catTokens.length === 0 && cat.category !== 'custom') return null
        return (
          <div key={cat.category} className="mb-2">
            <div className="px-3 py-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {cat.label}
              </span>
            </div>
            {catTokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                onChange={(hex) => setTokenHex(token.id, hex)}
                onRemove={token.isCustom ? () => removeCustomToken(token.id) : undefined}
              />
            ))}
            {cat.category === 'custom' && catTokens.length === 0 && !showNewForm && (
              <div className="px-3 py-2 text-[11px] text-muted-foreground italic">
                No custom tokens yet
              </div>
            )}
          </div>
        )
      })}

      {/* Create new token */}
      <div className="px-3 py-2 border-t border-border mt-1">
        {showNewForm ? (
          <NewTokenForm
            existingIds={tokens.map((t) => t.id)}
            onAdd={(t) => {
              addCustomToken(t)
              setShowNewForm(false)
            }}
            onCancel={() => setShowNewForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-blue-500 hover:text-blue-600 transition-colors w-full"
          >
            <Plus className="h-3.5 w-3.5" />
            Create token
          </button>
        )}
      </div>
    </div>
  )
}

function TokenRow({
  token,
  onChange,
  onRemove,
}: {
  token: ColorToken
  onChange: (hex: string) => void
  onRemove?: () => void
}) {
  const defaultToken = DEFAULT_TOKENS.find((d) => d.id === token.id)
  const isChanged = defaultToken ? token.hex.toLowerCase() !== defaultToken.hex.toLowerCase() : false

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface/60 transition-colors group">
      <label className="relative w-7 h-7 rounded-md border border-border cursor-pointer shrink-0 overflow-hidden shadow-sm">
        <div className="absolute inset-0" style={{ backgroundColor: token.hex }} />
        <input
          type="color"
          value={token.hex}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </label>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-foreground leading-tight flex items-center gap-1">
          <span className="font-mono text-[10px] text-muted-foreground">{token.id}</span>
          {isChanged && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          )}
          {token.isCustom && (
            <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1 rounded">custom</span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground truncate">{token.label}</div>
      </div>
      <span className="text-[10px] font-mono text-muted-foreground opacity-70">{token.hex}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
          title="Remove token"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

function NewTokenForm({
  existingIds,
  onAdd,
  onCancel,
}: {
  existingIds: string[]
  onAdd: (token: ColorToken) => void
  onCancel: () => void
}) {
  const [id, setId] = useState('')
  const [label, setLabel] = useState('')
  const [hex, setHex] = useState('#6366f1')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase()
  const isDuplicate = existingIds.includes(sanitizedId)
  const isValid = sanitizedId.length >= 2 && label.length >= 1 && !isDuplicate

  const handleSubmit = () => {
    if (!isValid) return
    onAdd({
      id: sanitizedId,
      label,
      description: 'Custom token',
      hex,
      category: 'custom',
      isCustom: true,
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="relative w-7 h-7 rounded-md border border-border cursor-pointer shrink-0 overflow-hidden shadow-sm">
          <div className="absolute inset-0" style={{ backgroundColor: hex }} />
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
        <div className="flex-1 space-y-1.5">
          <input
            ref={inputRef}
            placeholder="Token ID (e.g. brandRed)"
            value={id}
            onChange={(e) => setId(e.target.value)}
            className={cn(
              'w-full text-[11px] bg-surface border rounded px-2 py-1 font-mono outline-none focus:ring-1 focus:ring-blue-500',
              isDuplicate ? 'border-red-400' : 'border-border'
            )}
          />
          <input
            placeholder="Label (e.g. Brand Red)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full text-[11px] bg-surface border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      {isDuplicate && (
        <p className="text-[10px] text-red-400">Token ID already exists</p>
      )}
      <div className="flex gap-1.5">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="flex-1 text-[11px] font-medium bg-blue-500 text-white rounded py-1 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add token
        </button>
        <button
          onClick={onCancel}
          className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BRANDING TAB — map roles to tokens via dropdown
// ═══════════════════════════════════════════════════════════════════════════

function BrandingTab() {
  const { tokens, brandMappings, setBrandMapping } = useThemePlaygroundStore()

  return (
    <div className="py-2">
      <div className="px-3 py-1.5 mb-1">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Map each semantic role to a token. Changes apply live.
        </p>
      </div>

      {BRAND_SECTIONS.map((section) => (
        <div key={section.section} className="mb-2">
          <div className="px-3 py-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {section.section}
            </span>
          </div>
          {section.roles.map((role) => {
            const mappedTokenId = brandMappings[role.role] ?? 'primary'
            const defaultTokenId = DEFAULT_BRAND_MAPPINGS[role.role]
            const isOverridden = mappedTokenId !== defaultTokenId
            return (
              <RoleMappingRow
                key={role.role}
                label={role.label}
                description={role.description}
                selectedTokenId={mappedTokenId}
                isOverridden={isOverridden}
                tokens={tokens}
                onChange={(tokenId) => setBrandMapping(role.role, tokenId)}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

function RoleMappingRow({
  label,
  description,
  selectedTokenId,
  isOverridden,
  tokens,
  onChange,
}: {
  label: string
  description: string
  selectedTokenId: string
  isOverridden: boolean
  tokens: ColorToken[]
  onChange: (tokenId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedToken = tokens.find((t) => t.id === selectedTokenId)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  return (
    <div ref={containerRef} className="px-3 py-1.5 hover:bg-surface/60 transition-colors relative">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-foreground font-medium">{label}</span>
          {isOverridden && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          )}
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground mb-1.5">{description}</div>

      {/* Token selector trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2 bg-surface border border-border rounded-md px-2 py-1.5 hover:border-foreground/20 transition-colors text-left',
          isOpen && 'border-blue-500 ring-1 ring-blue-500/20'
        )}
      >
        <div
          className="w-4 h-4 rounded border border-border shrink-0"
          style={{ backgroundColor: selectedToken?.hex ?? '#000' }}
        />
        <span className="flex-1 text-[11px] font-mono text-foreground truncate">
          {selectedToken?.id ?? selectedTokenId}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {selectedToken?.hex ?? ''}
        </span>
        <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-2 right-2 z-50 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            {tokens.map((token) => {
              const isSelected = token.id === selectedTokenId
              return (
                <button
                  key={token.id}
                  onClick={() => {
                    onChange(token.id)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-surface transition-colors',
                    isSelected && 'bg-blue-500/10'
                  )}
                >
                  <div
                    className="w-4 h-4 rounded border border-border shrink-0"
                    style={{ backgroundColor: token.hex }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-mono text-foreground">{token.id}</span>
                    {token.isCustom && (
                      <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1 rounded ml-1">
                        custom
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{token.hex}</span>
                  {isSelected && (
                    <Check className="h-3 w-3 text-blue-500 shrink-0" />
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG TAB — JSON export with copy
// ═══════════════════════════════════════════════════════════════════════════

function ConfigTab() {
  const { tokens, brandMappings } = useThemePlaygroundStore()
  const [copied, setCopied] = useState(false)

  const buildConfig = useCallback(() => {
    const tokenMap: Record<string, string> = {}
    for (const t of tokens) {
      tokenMap[t.id] = t.hex
    }
    return {
      tokens: tokenMap,
      brandMappings,
    }
  }, [tokens, brandMappings])

  const configJson = JSON.stringify(buildConfig(), null, 2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(configJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="py-2">
      <div className="px-3 py-1.5 mb-2">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Your complete mailc theme config. Copy this JSON and use it in your project.
        </p>
      </div>

      {/* Config name */}
      <div className="px-3 mb-2">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          mailc Theme Config
        </div>
      </div>

      {/* JSON output */}
      <div className="mx-3 relative">
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface/80">
            <span className="text-[10px] font-mono text-muted-foreground">theme.config.json</span>
            <button
              onClick={handleCopy}
              className={cn(
                'flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded transition-all',
                copied
                  ? 'text-green-500 bg-green-500/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface'
              )}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="p-3">
            <CodeBlock code={configJson} language="json" maxHeight={Math.floor(window.innerHeight * 0.6)} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-3 mt-3 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Tokens</span>
          <span className="text-foreground font-mono">{tokens.length}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Custom tokens</span>
          <span className="text-foreground font-mono">{tokens.filter((t) => t.isCustom).length}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Brand mappings</span>
          <span className="text-foreground font-mono">{Object.keys(brandMappings).length}</span>
        </div>
      </div>
    </div>
  )
}
