/**
 * Splitkit shell shared between the markup (`/build/code`) and JSON
 * (`/build/json`) playgrounds. Mounts `<PlaygroundProvider>`, runs the
 * bundle's compile hook, and persists the layout tree to localStorage
 * under a per-bundle key so the two routes don't trample each other.
 */
import { useCallback, useMemo } from 'react'
import {
  LayoutProvider,
  LayoutRoot,
  Resizer,
  createPanel,
  createSplit,
  type LayoutNode,
  type RenderResizerProps,
} from 'react-splitkit'
import {
  PlaygroundProvider,
  type PlaygroundBundle,
} from './playground-context'
import { buildTabRegistry } from './tab-registry'
import { PanelChrome } from './PanelChrome'
import { PaneErrorBoundary } from './PaneErrorBoundary'
import { TemplateFooter } from './TemplateFooter'
import './splitkit-theme.css'

interface PaneCodeShellProps {
  bundle: PlaygroundBundle
  /** localStorage key for persisting this layout. Use a per-route key. */
  storageKey: string
}

function buildDefaultLayout(bundle: PlaygroundBundle): LayoutNode {
  // Derived read-only viewer for the complementary representation:
  //   • markup route → JSON view (json-view)
  //   • JSON route   → Markup view (markup-view)
  // See tab-registry.tsx for the matching registry entries.
  const isMarkupRoute = bundle.sourceTabType === 'markup'
  const viewerTabType = isMarkupRoute ? 'json-view' : 'markup-view'
  const viewerTitle = isMarkupRoute ? 'JSON' : 'Markup'

  return createSplit(
    'root',
    'horizontal',
    [
      // Column 1 — source editor, derived viewer (read-only), and templating
      // data, all tabbed. Order: source → derived view → data.
      createPanel('col-source', [
        {
          id: bundle.sourceTabType,
          tabType: bundle.sourceTabType,
          title: bundle.sourceTitle,
        },
        { id: viewerTabType, tabType: viewerTabType, title: viewerTitle },
        { id: 'data', tabType: 'data', title: 'Data' },
      ]),
      // Column 2 — HTML on top, Console on bottom (vertical split).
      createSplit(
        'col-html',
        'vertical',
        [
          createPanel('col-html-top', [
            { id: 'html', tabType: 'html', title: 'HTML' },
          ]),
          createPanel('col-html-bottom', [
            { id: 'console', tabType: 'console', title: 'Console' },
          ]),
        ],
        [62, 38],
      ),
      // Column 3 — Preview on top; bottom split varies by route:
      //   • markup route: Inspector | Layers (read-only debugger view)
      //   • JSON route:   Edit | Inspector  (TipTap inline editor +
      //     inspector). Layers stays available via the tab menu.
      // The Edit tab is JSON-only — the markup playground hasn't been
      // taught the markup↔JSON round-trip yet, so we don't surface it.
      createSplit(
        'col-right',
        'vertical',
        [
          createPanel('right-top', [
            { id: 'preview', tabType: 'preview', title: 'Preview' },
          ]),
          createSplit(
            'right-bottom',
            'horizontal',
            isMarkupRoute
              ? [
                  createPanel('right-bottom-inspector', [
                    { id: 'inspector', tabType: 'inspector', title: 'Inspector' },
                  ]),
                  createPanel('right-bottom-layers', [
                    { id: 'layers', tabType: 'layers', title: 'Layers' },
                  ]),
                ]
              : [
                  createPanel('right-bottom-edit', [
                    { id: 'edit-text', tabType: 'edit-text', title: 'Edit' },
                    { id: 'layers', tabType: 'layers', title: 'Layers' },
                  ]),
                  createPanel('right-bottom-inspector', [
                    { id: 'inspector', tabType: 'inspector', title: 'Inspector' },
                  ]),
                ],
            [50, 50],
          ),
        ],
        [55, 45],
      ),
    ],
    [30, 30, 40],
  )
}

function loadStoredLayout(key: string): LayoutNode | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as LayoutNode
  } catch {
    return null
  }
}

const SplitkitResizer = (p: RenderResizerProps) => (
  // `bg-transparent` keeps the resizer invisible at rest; the kit's
  // built-in `[data-splitkit-resizer]:hover` rule still highlights on
  // hover via `--sk-resizer-bg-hover` (see splitkit-theme.css).
  <Resizer splitId={p.splitId} index={p.index} className="bg-transparent" />
)

/**
 * Resets the persisted layout for a given storage key and reloads the page,
 * forcing the default layout to render. Wired to header "Reset layout"
 * buttons in the parent pages.
 */
export function resetPaneCodeLayout(storageKey: string) {
  try {
    localStorage.removeItem(storageKey)
  } finally {
    window.location.reload()
  }
}

export function PaneCodeShell({ bundle, storageKey }: PaneCodeShellProps) {
  // Drive the bundle's compile pipeline. Reused-store consumers (every tab)
  // see the freshest source map / HTML automatically.
  bundle.useCompilation()

  const registry = useMemo(() => buildTabRegistry(bundle), [bundle])

  const initialLayout = useMemo(
    () => loadStoredLayout(storageKey) ?? buildDefaultLayout(bundle),
    // bundle / storageKey are stable per-mount; recomputing per render would
    // resurrect stale layouts on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const handleChange = useCallback(
    (next: LayoutNode) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // Quota exhausted / Safari private mode — silently skip persistence.
      }
    },
    [storageKey],
  )

  const handleResetLayout = useCallback(() => {
    resetPaneCodeLayout(storageKey)
  }, [storageKey])

  return (
    <PlaygroundProvider bundle={bundle}>
      {/* Column layout: splitkit fills the available space, template footer
          is anchored at the bottom as its own intrinsic-height row. `gap-3`
          gives the footer breathing room from the panel chrome above so the
          two visually feel like separate surfaces, not one stuck-together
          slab. */}
      <div className="h-full w-full flex flex-col min-h-0 gap-3">
        <div className="flex-1 min-h-0">
          <PaneErrorBoundary>
            <LayoutProvider
              initialLayout={initialLayout}
              registry={registry}
              onChange={handleChange}
            >
              <LayoutRoot
                renderPanel={(p) => <PanelChrome {...p} />}
                renderResizer={SplitkitResizer}
                style={{ height: '100%' }}
              />
            </LayoutProvider>
          </PaneErrorBoundary>
        </div>
        <TemplateFooter onResetLayout={handleResetLayout} />
      </div>
    </PlaygroundProvider>
  )
}
