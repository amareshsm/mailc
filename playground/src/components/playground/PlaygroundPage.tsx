/**
 * Playground page — `/build/code` route.
 *
 * Splitkit-driven layout: every concern (markup, html, preview, console,
 * data, inspector, layers, tokens) lives in its own tab inside a draggable
 * pane. Implementation lives in `pages/playground-shell/PaneCodeShell` so
 * the JSON playground (`/build/json`) can reuse the same shell with a
 * different playground bundle.
 *
 * The Reset Layout affordance lives inside the shell's TemplateFooter
 * (icon-only button next to "All templates"), so this file is just the
 * route adapter — no chrome, no header bar.
 */
import { MARKUP_BUNDLE } from '@/pages/playground-shell/playground-context'
import { PaneCodeShell } from '@/pages/playground-shell/PaneCodeShell'

const STORAGE_KEY = 'build-code:layout:v1'

export function PlaygroundPage() {
  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <div className="flex-1 min-h-0 p-3">
        <PaneCodeShell bundle={MARKUP_BUNDLE} storageKey={STORAGE_KEY} />
      </div>
    </div>
  )
}
