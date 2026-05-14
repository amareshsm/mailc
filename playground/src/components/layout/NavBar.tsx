import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useThemeStore } from '@/lib/theme'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Sun, Moon, ChevronDown, Star, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { CommandPalette, useCommandPalette } from './CommandPalette'

interface NavItem {
  path: string
  label: string
  description?: string
  badge?: string
}

interface NavBucket {
  id: string
  label: string
  basePath: string
  items: NavItem[]
}

const BUCKETS: NavBucket[] = [
  {
    id: 'build',
    label: 'Build',
    basePath: '/build',
    items: [
      { path: '/build/visual',     label: 'Visual Builder',     description: 'Drag-drop email composer' },
      { path: '/build/code',       label: 'Code Playground',    description: 'Markup editor with source maps' },
      { path: '/build/json',       label: 'JSON Playground',    description: 'JSON IR editor with source maps' },
      { path: '/build/templating', label: 'Templating',         description: 'Variables, mc-if, mc-each' },
      { path: '/build/config',     label: 'Config Generator',   description: 'Build a mailc.config.ts visually' },
    ],
  },
  {
    id: 'style',
    label: 'Style',
    basePath: '/style',
    items: [
      { path: '/style/theme',         label: 'Theme & Tokens',  description: 'Class-mode theming + brand defaults' },
      { path: '/style/class',         label: 'Class Mode',      description: 'Tailwind-style utilities (limited support)', badge: 'limited' },
      { path: '/style/modes',         label: 'Modes Compared',  description: 'Attribute vs class side-by-side' },
      { path: '/style/compatibility', label: 'Client Compat',   description: 'caniemail check for any CSS' },
    ],
  },
  {
    id: 'extend',
    label: 'Extend',
    basePath: '/extend',
    items: [
      { path: '/extend/plugins',    label: 'Plugin Marketplace', description: 'defineComponent() showcase' },
      { path: '/extend/introspect', label: 'Introspect API',     description: 'validate, components, nesting, data' },
      { path: '/extend/mcp',        label: 'MCP for AI',         description: 'Model Context Protocol server' },
    ],
  },
]

export function NavBar(): JSX.Element {
  const { theme, toggleTheme } = useThemeStore()
  const location = useLocation()
  const [openBucket, setOpenBucket] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette()

  useEffect(() => {
    const scroller = document.querySelector('[data-scroll-root]') as HTMLElement | null
    if (!scroller) return
    const onScroll = () => setScrolled(scroller.scrollTop > 6)
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [location.pathname])

  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenBucket(null)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpenBucket(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    setOpenBucket(null)
    setScrolled(false)
  }, [location.pathname])

  return (
    <div className="shrink-0 relative z-40">
      <nav
        ref={navRef}
        className="flex items-center gap-1 px-3 sm:px-5 h-12"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
          borderBottom: '1px solid var(--border)',
          boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
          transition: 'box-shadow 0.25s',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 shrink-0 mr-2 hover:opacity-80 transition-opacity"
        >
          {/* mailc logo: envelope with <> compiler brackets */}
          <div
            className="w-6 h-6 flex items-center justify-center shrink-0"
            style={{
              borderRadius: 7,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-strong)',
              color: 'var(--accent)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {/* Envelope body */}
              <rect x="1" y="3" width="14" height="10" rx="1.5" />
              {/* Flap V-line */}
              <path d="M1.5 5.5L8 9.5L14.5 5.5" />
              {/* < bracket */}
              <path d="M4.5 10.5 L3 12 L4.5 13.5" strokeWidth="1.25" />
              {/* > bracket */}
              <path d="M11.5 10.5 L13 12 L11.5 13.5" strokeWidth="1.25" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
            mailc
          </span>
          <span
            className="hidden sm:inline-block text-[9.5px] font-mono uppercase tracking-wider px-2 py-0.5 shrink-0"
            style={{
              borderRadius: 999,
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              color: 'var(--fg-dim)',
            }}
          >
            v0.1 · beta
          </span>
        </Link>

        {/* Divider */}
        <div
          className="hidden md:block h-5 w-px shrink-0 mx-1"
          style={{ background: 'var(--border-strong)' }}
        />

        {/* Bucket nav — desktop only; mobile users use cmd-palette */}
        <div className="hidden md:flex items-center gap-0.5">
          {BUCKETS.map((bucket) => {
            const isActive = location.pathname.startsWith(bucket.basePath)
            const isOpen = openBucket === bucket.id
            return (
              <div key={bucket.id} className="relative">
                <button
                  onClick={() => setOpenBucket(isOpen ? null : bucket.id)}
                  onMouseEnter={() => setOpenBucket(bucket.id)}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  className="relative flex items-center gap-1 px-3 py-1.5 text-[13px] font-medium transition-colors z-10"
                  style={{
                    borderRadius: 8,
                    color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavTab"
                      className="absolute inset-0"
                      style={{ borderRadius: 8, background: 'var(--surface-2)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{bucket.label}</span>
                  <ChevronDown
                    className={cn(
                      'relative z-10 h-3 w-3 transition-transform duration-150',
                      isOpen && 'rotate-180'
                    )}
                  />
                </button>

                {isOpen && (
                  <div
                    onMouseLeave={() => setOpenBucket(null)}
                    className="absolute top-full left-0 mt-1.5 w-72 overflow-hidden z-50"
                    style={{
                      borderRadius: 14,
                      background: 'var(--dropdown-bg)',
                      backdropFilter: 'blur(40px) saturate(1.8)',
                      WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
                      border: '1px solid var(--glass-border)',
                      boxShadow: 'inset 0 1px 0 var(--glass-highlight), var(--shadow-lg)',
                    }}
                  >
                    <div className="p-1.5">
                      {bucket.items.map((item) => {
                        const itemActive = location.pathname === item.path
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                              'block px-3 py-2 transition-colors',
                              itemActive ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-1)]'
                            )}
                            style={{ borderRadius: 8 }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium" style={{ color: 'var(--fg)' }}>
                                {item.label}
                              </span>
                              {item.badge && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <div
                                className="mt-0.5 text-[11px] leading-relaxed"
                                style={{ color: 'var(--fg-dim)' }}
                              >
                                {item.description}
                              </div>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      <Link
                        to={bucket.basePath}
                        className="block px-3 py-2 text-[11px] transition-colors hover:bg-[var(--surface-1)]"
                        style={{ color: 'var(--fg-dim)' }}
                      >
                        View all in {bucket.label} →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex-1" />

        {/* Search trigger */}
        <button
          onClick={() => setCmdOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-[var(--surface-2)] w-56 lg:w-64"
          style={{
            borderRadius: 8,
            color: 'var(--fg-muted)',
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
          }}
          aria-label="Search (⌘K)"
        >
          <Search style={{ width: 13, height: 13 }} />
          <span style={{ fontSize: 12.5, fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em' }}>
            Search
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              padding: '1px 5px',
              borderRadius: 4,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--fg-dim)',
              letterSpacing: '0.04em',
            }}
          >
            ⌘K
          </span>
        </button>

        {/* Mobile-only search icon (cmd-palette trigger) */}
        <button
          onClick={() => setCmdOpen(true)}
          className="md:hidden flex items-center justify-center w-8 h-8 transition-colors hover:bg-[var(--surface-2)]"
          style={{ borderRadius: 8, color: 'var(--fg-muted)' }}
          aria-label="Search (⌘K)"
        >
          <Search className="h-3.5 w-3.5" />
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-1 sm:ml-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-8 h-8 transition-colors hover:bg-[var(--surface-2)]"
                style={{ borderRadius: 8, color: 'var(--fg-muted)' }}
                aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Moon className="h-3.5 w-3.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
          </Tooltip>

          <a
            href="https://github.com/anthropics/mailc"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[12.5px] font-medium transition-all hover:brightness-110"
            style={{
              borderRadius: 8,
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.12), 0 2px 8px -2px rgb(var(--accent-glow) / 0.4)',
            }}
          >
            <Star className="h-3 w-3" />
            <span className="hidden sm:inline">Star on GitHub</span>
            <span className="sm:hidden">Star</span>
          </a>
        </div>
      </nav>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}
