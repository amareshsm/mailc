import { useState, useCallback, useEffect, useRef } from 'react'
import { useClassThemeStore } from '@/store/class-theme-store'
import {
  CLASS_TOKENS,
  CLASS_TOKEN_SECTIONS,
  DEFAULT_CLASS_HEX,
  DEFAULT_CLASS_BRAND_MAPPINGS,
  buildThemeColorsWithMappings,
  type ClassToken,
} from '@/lib/class-brand-tokens'
import { RotateCcw, Copy, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code-block'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

type PanelTab = 'brand' | 'tokens' | 'config'

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
          layoutId="classConfigTab"
          className="absolute inset-0 bg-background rounded shadow-sm"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────

export function ClassConfigPanel() {
  const [tab, setTab] = useState<PanelTab>('brand')
  const {
    getTokenOverrideCount,
    getMappingOverrideCount,
    resetTokens,
    resetBrandMappings,
  } = useClassThemeStore()

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
            Theme Tokens
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
          <TabBtn active={tab === 'brand'} onClick={() => setTab('brand')}>Brand</TabBtn>
          <TabBtn active={tab === 'tokens'} onClick={() => setTab('tokens')}>Tokens</TabBtn>
          <TabBtn active={tab === 'config'} onClick={() => setTab('config')}>Config</TabBtn>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'brand' ? <BrandTab /> : tab === 'tokens' ? <TokensTab /> : <ConfigTab />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BRAND TAB
//
// Each token slot in the template (e.g. "brand") can be remapped to inject
// a DIFFERENT token's current hex into that color slot at compile time.
//
// Default: every slot maps to itself  → brand slot uses brand's own hex.
// Remapped: brand slot → brand-heading → compile receives brand=#111827.
//
// This is identical in feel to the /brand-theme-attribute brand tab
// (dropdown selector, not a direct color picker) but works via theme
// injection rather than hex find-replace in post-compiled HTML.
// ═══════════════════════════════════════════════════════════════════════════

function BrandTab() {
  const { tokens, brandMappings, setBrandMapping } = useClassThemeStore()

  return (
    <div className="py-2">
      <div className="px-3 py-1.5 mb-1">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Each slot maps to a token whose hex is injected at compile time.
          Remapping a slot doesn't change the token's own hex — only which
          value flows into that CSS class slot.
        </p>
      </div>

      {CLASS_TOKEN_SECTIONS.map((section) => {
        const sectionTokens = CLASS_TOKENS.filter((t) => t.section === section)
        if (sectionTokens.length === 0) return null
        return (
          <div key={section} className="mb-2">
            <div className="px-3 py-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {section}
              </span>
            </div>
            {sectionTokens.map((slot) => {
              const mappedTokenId = brandMappings[slot.id] ?? slot.id
              const isOverridden = mappedTokenId !== DEFAULT_CLASS_BRAND_MAPPINGS[slot.id]
              return (
                <SlotMappingRow
                  key={slot.id}
                  slot={slot}
                  mappedTokenId={mappedTokenId}
                  isOverridden={isOverridden}
                  tokens={tokens}
                  onChange={(tokenId) => setBrandMapping(slot.id, tokenId)}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function SlotMappingRow({
  slot,
  mappedTokenId,
  isOverridden,
  tokens,
  onChange,
}: {
  slot: ClassToken
  mappedTokenId: string
  isOverridden: boolean
  tokens: ClassToken[]
  onChange: (tokenId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const mappedToken = tokens.find((t) => t.id === mappedTokenId)

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
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-[11px] text-foreground font-medium">{slot.label}</span>
        {isOverridden && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
        )}
      </div>
      <div className="text-[10px] text-muted-foreground mb-1.5">
        {slot.description}
        <span className="ml-1 font-mono opacity-60">{slot.exampleClass}</span>
      </div>

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
          style={{ backgroundColor: mappedToken?.hex ?? '#000' }}
        />
        <span className="flex-1 text-[11px] font-mono text-foreground truncate">
          {mappedToken?.id ?? mappedTokenId}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {mappedToken?.hex ?? ''}
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
            className="absolute left-2 right-2 z-50 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto"
          >
            {tokens.map((token) => {
              const isSelected = token.id === mappedTokenId
              return (
                <button
                  key={token.id}
                  onClick={() => { onChange(token.id); setIsOpen(false) }}
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
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{token.hex}</span>
                  {isSelected && <Check className="h-3 w-3 text-blue-500 shrink-0" />}
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
// TOKENS TAB — raw hex editors
// ═══════════════════════════════════════════════════════════════════════════

function TokensTab() {
  const { tokens, setTokenHex } = useClassThemeStore()

  return (
    <div className="py-2">
      <div className="px-3 py-1.5 mb-1">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Edit the raw hex for each token. Changes flow into every slot that is
          mapped to this token (via the Brand tab).
        </p>
      </div>

      {CLASS_TOKEN_SECTIONS.map((section) => {
        const sectionTokens = tokens.filter((t) => t.section === section)
        if (sectionTokens.length === 0) return null
        return (
          <div key={section} className="mb-2">
            <div className="px-3 py-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {section}
              </span>
            </div>
            {sectionTokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                onChange={(hex) => setTokenHex(token.id, hex)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function TokenRow({ token, onChange }: { token: ClassToken; onChange: (hex: string) => void }) {
  const defaultHex = DEFAULT_CLASS_HEX[token.id]
  const isChanged = defaultHex ? token.hex.toLowerCase() !== defaultHex.toLowerCase() : false

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface/60 transition-colors">
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
          <span className="font-medium">{token.label}</span>
          {isChanged && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
        </div>
        <div className="text-[10px] text-muted-foreground font-mono truncate">{token.exampleClass}</div>
      </div>
      <span className="text-[10px] font-mono text-muted-foreground opacity-70">{token.hex}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG TAB — shows the exact compile() call ready to copy
// ═══════════════════════════════════════════════════════════════════════════

function ConfigTab() {
  const { tokens, brandMappings } = useClassThemeStore()
  const [copied, setCopied] = useState(false)

  const effectiveColors = useCallback(
    () => buildThemeColorsWithMappings(tokens, brandMappings),
    [tokens, brandMappings]
  )

  const snippet = `import { compile } from 'mailc'

const result = compile(markup, ${JSON.stringify({ templateStyle: 'class', theme: { extend: { colors: effectiveColors() } } }, null, 2)})`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="py-2">
      <div className="px-3 py-1.5 mb-2">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Resolved compile options — token hex values with brand mappings applied.
          Copy into your project to reproduce the current theme.
        </p>
      </div>

      <div className="mx-3">
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface/80">
            <span className="text-[10px] font-mono text-muted-foreground">compile options</span>
            <button
              onClick={handleCopy}
              className={cn(
                'flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded transition-all',
                copied
                  ? 'text-green-500 bg-green-500/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface'
              )}
            >
              {copied ? <><Check className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
            </button>
          </div>
          <div className="p-3">
            <CodeBlock code={snippet} language="typescript" maxHeight={Math.floor(window.innerHeight * 0.6)} />
          </div>
        </div>
      </div>

      <div className="px-3 mt-3 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Token overrides</span>
          <span className="text-foreground font-mono">{useClassThemeStore.getState().getTokenOverrideCount()}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Mapping overrides</span>
          <span className="text-foreground font-mono">{useClassThemeStore.getState().getMappingOverrideCount()}</span>
        </div>
      </div>
    </div>
  )
}
