import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, Compass, Hammer, Code2, Braces, Zap, Box, FlaskConical,
  Palette, Layers, SlidersHorizontal, Monitor, Accessibility, Moon,
  Puzzle, Search, Microscope, Cpu, GitFork, Database, FileOutput,
  type LucideIcon,
} from 'lucide-react'

interface CmdItem {
  group: string
  Icon: LucideIcon
  label: string
  hint: string
  path?: string
}

const CMD_ITEMS: CmdItem[] = [
  // Navigate
  { group: 'Navigate', Icon: Home,     label: 'Go to Home',    hint: 'Landing page',           path: '/' },
  { group: 'Navigate', Icon: Compass,  label: 'Take the Tour', hint: 'Interactive walkthrough', path: '/tour' },
  { group: 'Navigate', Icon: Hammer,   label: 'Build Hub',     hint: 'All build tools',         path: '/build' },
  { group: 'Navigate', Icon: Palette,  label: 'Style Hub',     hint: 'All style tools',         path: '/style' },
  { group: 'Navigate', Icon: Puzzle,   label: 'Extend Hub',    hint: 'Plugins & APIs',          path: '/extend' },

  // Build
  { group: 'Build', Icon: Hammer,       label: 'Visual Builder',      hint: 'Drag-drop email composer',        path: '/build/visual' },
  { group: 'Build', Icon: Code2,        label: 'Code Playground',     hint: 'Markup editor with source maps',  path: '/build/code' },
  { group: 'Build', Icon: Braces,       label: 'JSON Playground',     hint: 'JSON IR editor with source maps', path: '/build/json' },
  { group: 'Build', Icon: Zap,          label: 'Templating',          hint: 'Variables, mc-if, mc-each',       path: '/build/templating' },
  { group: 'Build', Icon: Box,          label: 'Visual JSON Builder', hint: 'Full visual JSON editor',         path: '/build/visual-json' },
  { group: 'Build', Icon: FlaskConical, label: 'Sandbox',             hint: 'Free-form experiment area',       path: '/build/sandbox' },

  // Style
  { group: 'Style', Icon: Palette,           label: 'Theme & Tokens',  hint: 'Class-mode theming + brand defaults', path: '/style/theme' },
  { group: 'Style', Icon: Layers,            label: 'Class Mode',      hint: 'Tailwind-style utilities',            path: '/style/class' },
  { group: 'Style', Icon: SlidersHorizontal, label: 'Modes Compared',  hint: 'Attribute vs class side-by-side',     path: '/style/modes' },
  { group: 'Style', Icon: Monitor,           label: 'Client Compat',   hint: 'caniemail check for any CSS',         path: '/style/compatibility' },
  { group: 'Style', Icon: Accessibility,     label: 'Accessibility',   hint: 'a11y audit for email markup',         path: '/style/a11y' },
  { group: 'Style', Icon: Moon,              label: 'Dark Mode',       hint: 'Dark mode rendering preview',         path: '/style/dark-mode' },

  // Extend
  { group: 'Extend', Icon: Puzzle,      label: 'Plugin Marketplace', hint: 'defineComponent() showcase',                path: '/extend/plugins' },
  { group: 'Extend', Icon: Microscope,  label: 'Introspect API',     hint: 'validate, components, nesting, data',       path: '/extend/introspect' },
  { group: 'Extend', Icon: Cpu,         label: 'MCP for AI',         hint: 'Model Context Protocol server',             path: '/extend/mcp' },
  { group: 'Extend', Icon: Search,      label: 'Validate Sandbox',   hint: 'Live validation against JSON schema',       path: '/extend/introspect/validate' },
  { group: 'Extend', Icon: Box,         label: 'Component Explorer', hint: 'Browse all registered components',          path: '/extend/introspect/components' },
  { group: 'Extend', Icon: GitFork,     label: 'Nesting Matrix',     hint: 'Which components can nest inside which',    path: '/extend/introspect/nesting' },
  { group: 'Extend', Icon: Database,    label: 'Data Contract',      hint: 'Props, slots, and data shape per component', path: '/extend/introspect/data' },
  { group: 'Extend', Icon: FileOutput,  label: 'Output Explorer',    hint: 'Compiled HTML output viewer',               path: '/extend/introspect/output' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setIdx(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [open])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return CMD_ITEMS
    return CMD_ITEMS.filter(
      (i) =>
        i.label.toLowerCase().includes(query) ||
        i.group.toLowerCase().includes(query) ||
        i.hint.toLowerCase().includes(query)
    )
  }, [q])

  const grouped = useMemo(() => {
    const g: Record<string, CmdItem[]> = {}
    filtered.forEach((item) => {
      if (!g[item.group]) g[item.group] = []
      g[item.group].push(item)
    })
    return g
  }, [filtered])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIdx((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        const item = filtered[idx]
        if (item?.path) navigate(item.path)
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, idx, filtered, onClose, navigate])

  if (!open) return null

  let running = 0

  return (
    <div
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(8px) saturate(1.2)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        animation: 'fade-in 0.2s var(--ease-out)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-strong"
        style={{
          width: 'min(600px, 94vw)',
          borderRadius: 20,
          overflow: 'hidden',
          animation: 'float-in 0.25s var(--ease-out)',
        }}
      >
        {/* Input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <Search size={16} style={{ flexShrink: 0, color: 'var(--fg-dim)' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setIdx(0)
            }}
            placeholder="Search pages and tools…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--fg)',
              fontSize: 14.5,
              fontFamily: 'var(--font-sans)',
              letterSpacing: '-0.01em',
            }}
          />
          <KbdChip>ESC</KbdChip>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: 8 }}>
          {Object.keys(grouped).length === 0 && (
            <div
              style={{
                padding: '36px 20px',
                textAlign: 'center',
                color: 'var(--fg-dim)',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
              }}
            >
              No matches found
            </div>
          )}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 4 }}>
              <div
                style={{
                  padding: '8px 12px 4px',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-dim)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {group}
              </div>
              {items.map((item) => {
                const thisIdx = running++
                const active = thisIdx === idx
                const { Icon } = item
                return (
                  <button
                    key={item.label}
                    onMouseEnter={() => setIdx(thisIdx)}
                    onClick={() => {
                      if (item.path) navigate(item.path)
                      onClose()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: 'none',
                      background: active ? 'var(--surface-2)' : 'transparent',
                      color: active ? 'var(--fg)' : 'var(--fg-muted)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.08s',
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: 'var(--surface-1)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: active ? 'var(--accent)' : 'var(--fg-dim)',
                        transition: 'color 0.15s',
                      }}
                    >
                      <Icon size={14} strokeWidth={1.8} />
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        color: 'var(--fg-dim)',
                        fontFamily: 'var(--font-mono)',
                        flexShrink: 0,
                        paddingLeft: 8,
                      }}
                    >
                      {item.hint}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '9px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--fg-dim)',
            background: 'var(--surface-1)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <KbdChip>↑</KbdChip>
              <KbdChip>↓</KbdChip>
              navigate
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <KbdChip>↵</KbdChip>
              select
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              opacity: 0.65,
              letterSpacing: '0.04em',
            }}
          >
            mailc // cmd
          </span>
        </div>
      </div>
    </div>
  )
}

function KbdChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        padding: '2px 5px',
        borderRadius: 5,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        color: 'var(--fg-muted)',
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  )
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return { open, setOpen }
}
