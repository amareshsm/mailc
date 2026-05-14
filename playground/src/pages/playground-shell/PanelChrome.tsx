/**
 * Panel chrome — splitkit headless panel wrapper, themed to the playground.
 *
 * Adopts the *layout* of the splitkit GFE demo (rounded panel, single-row
 * tab strip, "+" leading slot, "…" trailing menu, collapsed-bar mode) but
 * paints every surface with the playground's existing theme tokens
 * (`bg-card`, `bg-surface`, `border-border`, `text-foreground`, …) so it
 * blends with the rest of the app and tracks light/dark mode automatically.
 *
 * Behaviour mirrors the demo: clicking "+" inserts a `new-tab` placeholder
 * descriptor whose content is the chip chooser. Picking a chip swaps the
 * placeholder for the chosen tab type.
 */
import { useEffect, useRef, useState } from 'react'
import {
  TabList,
  TabPanel,
  usePanel,
  useTabRegistry,
  type RenderPanelProps,
  type TabDescriptor,
  type TabRegistryEntry,
} from 'react-splitkit'
import { cn } from '@/lib/utils'
import {
  CloseIcon,
  CollapseIcon,
  ExpandChevronIcon,
  MaximizeIcon,
  MoreIcon,
  PlusIcon,
  RestoreIcon,
  SplitDownIcon,
  SplitRightIcon,
} from './icons'

// Module-scoped counter for unique tab IDs. `Math.random()` in a click
// handler trips react-hooks/purity (the rule can't tell handler from
// render); a counter is observably pure to the lint and gives the same
// uniqueness guarantee within a session.
let nextTabIdSeq = 0

// ── Outer chrome ──────────────────────────────────────────────────────────

export function PanelChrome({ panel, style }: RenderPanelProps) {
  const { toggleMaximize, toggleCollapse, split, closePanel } = usePanel(panel.id)
  const registry = useTabRegistry()
  const isMaximized = panel.maximized ?? false

  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  useClickOutside(moreRef, () => setMoreOpen(false))

  if (panel.collapsed) {
    return (
      <div
        style={style}
        className="flex flex-col rounded-lg border border-border bg-card overflow-hidden shadow-sm"
      >
        <div
          className="flex items-center h-[42px] px-4 cursor-pointer select-none"
          onClick={() => toggleCollapse()}
          title="Expand panel"
        >
          <div className="flex items-center gap-5 min-w-0 flex-1 overflow-hidden">
            {panel.tabs.map((t) => {
              const isActive = t.id === panel.activeTabId
              const entry = registry[t.tabType]
              return (
                <span
                  key={t.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap',
                    isActive
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground/60',
                  )}
                >
                  {isActive && entry?.renderLabel ? entry.renderLabel(t) : t.title}
                </span>
              )
            })}
          </div>
          <ExpandChevronIcon className="flex-shrink-0 ml-3 text-muted-foreground/60" />
        </div>
      </div>
    )
  }

  return (
    <div
      style={style}
      className="flex flex-col rounded-lg border border-border bg-card overflow-hidden shadow-sm min-w-0"
    >
      <TabList
        panelId={panel.id}
        // No `overflow-x-auto` here — it would create a clipping context
        // that swallows the absolutely-positioned "…" dropdown that pops
        // below the tab strip.
        //
        // `bg-muted` (rgba(0,0,0,0.05) light / rgba(255,255,255,0.05) dark)
        // gives a clearly-recessed strip in *both* themes. The earlier
        // `bg-surface/50` was nearly invisible in light mode because the
        // surface token is itself translucent white (~65% opacity over the
        // page bg) so a 50% opacity layer over the white card disappears.
        className="flex items-stretch h-[38px] border-b border-border flex-shrink-0 bg-muted"
        leading={<AddTabButton panelId={panel.id} />}
        trailing={
          <div ref={moreRef} className="relative flex items-center px-1.5">
            <button
              type="button"
              aria-label="More options"
              onClick={() => setMoreOpen((v) => !v)}
              // hover lifts out of `bg-muted` strip onto `bg-card` so the
              // affordance reads in both light and dark themes.
              className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            >
              <MoreIcon />
            </button>
            {moreOpen && (
              <div className="absolute top-full right-0 mt-1 z-50 min-w-[192px] rounded-lg border border-border bg-card shadow-xl py-1.5 overflow-hidden">
                <MenuItem
                  icon={isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
                  label={isMaximized ? 'Restore' : 'Maximize'}
                  onClick={() => {
                    toggleMaximize()
                    setMoreOpen(false)
                  }}
                />
                <MenuItem
                  icon={<CollapseIcon />}
                  label="Collapse"
                  onClick={() => {
                    toggleCollapse()
                    setMoreOpen(false)
                  }}
                />
                <Separator />
                <MenuItem
                  icon={<SplitRightIcon />}
                  label="Split right"
                  onClick={() => {
                    split('right')
                    setMoreOpen(false)
                  }}
                />
                <MenuItem
                  icon={<SplitDownIcon />}
                  label="Split down"
                  onClick={() => {
                    split('bottom')
                    setMoreOpen(false)
                  }}
                />
                <Separator />
                <MenuItem
                  icon={<CloseIcon width={13} height={13} />}
                  label="Close pane"
                  danger
                  onClick={() => {
                    closePanel()
                    setMoreOpen(false)
                  }}
                />
              </div>
            )}
          </div>
        }
        renderTab={({ tab, isActive, tabProps, label, closable, close }) => (
          <button
            {...tabProps}
            type="button"
            className={cn(
              'group inline-flex items-center gap-1.5 px-3 h-full text-[13px] select-none transition-colors border-b-2 -mb-px',
              isActive
                ? 'border-accent text-foreground font-medium bg-card'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-card/60',
            )}
          >
            <span className="inline-flex items-center gap-1.5">{label}</span>
            {closable && tab.tabType !== 'new-tab' && (
              <span
                role="button"
                aria-label="Close tab"
                onClick={(e) => {
                  e.stopPropagation()
                  close()
                }}
                className="opacity-0 group-hover:opacity-60 rounded p-0.5 hover:opacity-100 hover:bg-surface-hover transition-opacity"
              >
                <CloseIcon width={11} height={11} />
              </span>
            )}
            {tab.tabType === 'new-tab' && (
              <span
                role="button"
                aria-label="Close tab"
                onClick={(e) => {
                  e.stopPropagation()
                  close()
                }}
                className="opacity-40 group-hover:opacity-70 rounded p-0.5 hover:opacity-100 hover:bg-surface-hover transition-opacity"
              >
                <CloseIcon width={11} height={11} />
              </span>
            )}
          </button>
        )}
      />

      <div className="flex-1 min-h-0 relative bg-card">
        <TabPanel
          panelId={panel.id}
          mode="mount-all-hide-inactive"
          style={{ position: 'absolute', inset: 0 }}
          className="flex flex-col overflow-hidden"
          renderContent={(tab, ctx) => {
            if (tab.tabType === 'new-tab') {
              return <NewTabChooser placeholderId={tab.id} panelId={ctx.panelId} />
            }
            const entry = registry[tab.tabType]
            return entry?.render(tab, ctx) ?? null
          }}
        />
      </div>
    </div>
  )
}

// ── New-tab placeholder + chooser ─────────────────────────────────────────

function AddTabButton({ panelId }: { panelId: string }) {
  const { addTab } = usePanel(panelId)
  return (
    <button
      type="button"
      aria-label="New tab"
      onClick={() => {
        const id = `new-${Math.random().toString(36).slice(2, 8)}`
        addTab({ id, tabType: 'new-tab', title: 'New tab' }, { activate: true })
      }}
      // hover lifts out of `bg-muted` strip onto `bg-card`; works in both
      // light and dark.
      className="flex items-center justify-center w-[30px] h-[30px] mx-1.5 my-auto rounded-full cursor-pointer text-muted-foreground hover:text-foreground hover:bg-card transition-colors flex-shrink-0"
    >
      <PlusIcon width={14} height={14} />
    </button>
  )
}

function NewTabChooser({
  placeholderId,
  panelId,
}: {
  placeholderId: string
  panelId: string
}) {
  const registry = useTabRegistry()
  const { panel, addTab, removeTab } = usePanel(panelId)

  const choices: TabRegistryEntry[] = Object.values(registry).filter(
    (e) => e.availableInAddMenu !== false,
  )

  const pick = (descriptor: TabDescriptor) => {
    if (!panel) return
    const index = panel.tabs.findIndex((t) => t.id === placeholderId)
    const unique: TabDescriptor = {
      ...descriptor,
      id: `${descriptor.tabType}-${++nextTabIdSeq}`,
    }
    addTab(unique, { activate: true, index: index >= 0 ? index + 1 : undefined })
    removeTab(placeholderId)
  }

  const pickEntry = (entry: TabRegistryEntry) =>
    pick({ id: entry.tabType, tabType: entry.tabType, title: entry.title })

  return (
    <div className="h-full overflow-y-auto p-6 bg-card">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
        Add a tab
      </p>
      <div className="flex flex-wrap gap-2">
        {choices.map((entry) => (
          <button
            key={entry.tabType}
            type="button"
            onClick={() => pickEntry(entry)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-[13px] text-foreground hover:bg-muted hover:border-border/80 transition-colors cursor-pointer"
          >
            {entry.icon && <span className="text-muted-foreground">{entry.icon}</span>}
            {entry.title}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Menu primitives ───────────────────────────────────────────────────────

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-[13px] transition-colors',
        danger
          ? 'text-red-500 hover:bg-red-500/10'
          : 'text-foreground hover:bg-muted',
      )}
    >
      <span className={danger ? 'text-red-500/70' : 'text-muted-foreground'}>
        {icon}
      </span>
      {label}
    </button>
  )
}

function Separator() {
  return <div className="my-1 mx-2 border-t border-border" />
}

// ── Click-outside helper ──────────────────────────────────────────────────

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  cb: () => void,
) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, cb])
}
