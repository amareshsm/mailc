/**
 * Footer anchored at the bottom of the playground shell:
 *
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │  [≡ All templates]   ‹  Welcome to mailc  ›   Showcase · 4/12      │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * Reads `selectedTemplateId` / `setSelectedTemplate` via the active
 * playground bundle so it works for both markup and JSON variants.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  LayoutPanelLeft,
  ListFilter,
  Search,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  TEMPLATES,
  getTemplatesByFeature,
  getTemplateById,
  type Template,
  type TemplateCategory,
} from '@/templates'
import { usePlayground } from './playground-context'

// Only templates that have full source-map support — the playground tabs
// (Inspector / Layers / line-click) rely on it. This mirrors the filter the
// stores use when building their template lists.
const TEMPLATE_LIST = getTemplatesByFeature(TEMPLATES, 'source-map-friendly')

const CATEGORY_GROUPS: { id: TemplateCategory; label: string }[] = [
  { id: 'showcase',       label: 'Showcase' },
  { id: 'dynamic',        label: 'Dynamic data' },
  { id: 'theme-class',    label: 'Brand theming' },
  { id: 'theme-attribute', label: 'Theme attributes' },
]

const CATEGORY_LABEL: Record<TemplateCategory, string> = Object.fromEntries(
  CATEGORY_GROUPS.map((g) => [g.id, g.label]),
) as Record<TemplateCategory, string>

interface TemplateFooterProps {
  /**
   * Optional reset-layout callback. Rendered as an icon button next to the
   * "All templates" trigger. Omitted by consumers who don't expose layout
   * persistence.
   */
  onResetLayout?: () => void
}

export function TemplateFooter({ onResetLayout }: TemplateFooterProps) {
  const { useStore } = usePlayground()
  const selectedTemplateId = useStore((s) => s.selectedTemplateId)
  const setSelectedTemplate = useStore((s) => s.setSelectedTemplate)

  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  useClickOutside(pickerRef, () => setPickerOpen(false), pickerOpen)

  // Esc closes the picker.
  useEffect(() => {
    if (!pickerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pickerOpen])

  const activeTemplate = getTemplateById(TEMPLATE_LIST, selectedTemplateId)
  const currentIndex = TEMPLATE_LIST.findIndex((t) => t.id === selectedTemplateId)
  const total = TEMPLATE_LIST.length

  const goPrev = useCallback(() => {
    if (currentIndex < 0) return
    const next = TEMPLATE_LIST[(currentIndex - 1 + total) % total]
    setSelectedTemplate(next.id)
  }, [currentIndex, total, setSelectedTemplate])

  const goNext = useCallback(() => {
    if (currentIndex < 0) return
    const next = TEMPLATE_LIST[(currentIndex + 1) % total]
    setSelectedTemplate(next.id)
  }, [currentIndex, total, setSelectedTemplate])

  const handlePick = useCallback(
    (id: string) => {
      setSelectedTemplate(id)
      setPickerOpen(false)
    },
    [setSelectedTemplate],
  )

  return (
    <div className="relative shrink-0 rounded-lg border border-border bg-card overflow-visible">
      {/* The footer bar */}
      <div className="h-9 px-3 flex items-center gap-1 text-[12px]">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 px-2 h-7 rounded-md transition-colors cursor-pointer',
            pickerOpen
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          <ListFilter className="h-3.5 w-3.5" />
          All templates
        </button>
        {onResetLayout && (
          <button
            type="button"
            onClick={onResetLayout}
            title="Reset layout to default"
            aria-label="Reset layout"
            className="flex items-center gap-1.5 px-2 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <LayoutPanelLeft className="h-3.5 w-3.5" />
            Reset
          </button>
        )}

        <div className="flex-1 flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            disabled={total < 2}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Previous template"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="px-3 h-7 rounded-md font-medium text-foreground hover:bg-muted transition-colors max-w-[420px] truncate cursor-pointer"
            title={activeTemplate?.label ?? 'No template selected'}
          >
            {activeTemplate?.label ?? '— select a template —'}
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={total < 2}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Next template"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
          {activeTemplate && (
            <span className="hidden md:inline">
              {CATEGORY_LABEL[activeTemplate.category] ?? activeTemplate.category}
            </span>
          )}
          {currentIndex >= 0 && (
            <span>
              {currentIndex + 1}/{total}
            </span>
          )}
        </div>
      </div>

      {/* Picker popover — anchored above the footer, edges flush with the
          footer (and therefore with the panels above) so the chrome reads
          as one continuous column rather than three slightly-misaligned
          surfaces. */}
      {pickerOpen && (
        <div
          ref={pickerRef}
          className="absolute bottom-full left-0 right-0 mb-3 rounded-lg border border-border bg-card shadow-2xl overflow-hidden z-40"
        >
          <TemplatePicker
            templates={TEMPLATE_LIST}
            selectedId={selectedTemplateId}
            onPick={handlePick}
            onClose={() => setPickerOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

// ── Picker ────────────────────────────────────────────────────────────────

interface TemplatePickerProps {
  templates: Template[]
  selectedId: string
  onPick: (id: string) => void
  onClose: () => void
}

function TemplatePicker({
  templates,
  selectedId,
  onPick,
  onClose,
}: TemplatePickerProps) {
  const [query, setQuery] = useState('')

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = q
      ? templates.filter(
          (t) =>
            t.label.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q),
        )
      : templates

    const byCategory = new Map<TemplateCategory, Template[]>()
    for (const t of matches) {
      const list = byCategory.get(t.category) ?? []
      list.push(t)
      byCategory.set(t.category, list)
    }
    return CATEGORY_GROUPS.map((g) => ({
      ...g,
      items: byCategory.get(g.id) ?? [],
    })).filter((g) => g.items.length > 0)
  }, [templates, query])

  return (
    <div className="flex flex-col max-h-[420px]">
      {/* Header — search + close */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates"
          className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Close picker"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body — grouped list */}
      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
            No templates match “{query}”.
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.id} className="py-1">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}{' '}
                <span className="text-muted-foreground/40 font-normal tabular-nums">
                  {group.items.length}
                </span>
              </div>
              {group.items.map((t) => {
                const isActive = t.id === selectedId
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onPick(t.id)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 flex items-start gap-3 transition-colors cursor-pointer',
                      isActive
                        ? 'bg-accent/10 text-foreground'
                        : 'text-foreground hover:bg-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1 inline-block h-1.5 w-1.5 rounded-full shrink-0',
                        isActive ? 'bg-accent' : 'bg-transparent',
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          'text-[13px]',
                          isActive ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {t.label}
                      </div>
                      {t.description && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {t.description}
                        </div>
                      )}
                    </div>
                    {t.level && (
                      <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-1">
                        {t.level}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Click-outside helper ──────────────────────────────────────────────────

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  cb: () => void,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, cb, active])
}
