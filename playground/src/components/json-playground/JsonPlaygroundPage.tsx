/**
 * JSON Playground page — `/build/json` route.
 *
 * Same splitkit shell as the markup playground, but bound to the JSON
 * playground bundle: the source tab in column 1 shows a JSON editor instead
 * of `.mc` markup, and store reads/writes go through `useJsonPlaygroundStore`
 * via `<PlaygroundProvider bundle={JSON_BUNDLE}>`.
 *
 * The shell, panel chrome, tab registry, default 3-column layout, and the
 * Reset-Layout icon (inside TemplateFooter) are all shared with
 * `PlaygroundPage`. Only the bundle and localStorage key differ.
 */
import { JSON_BUNDLE } from '@/pages/playground-shell/playground-context'
import { PaneCodeShell } from '@/pages/playground-shell/PaneCodeShell'

const STORAGE_KEY = 'build-json:layout:v1'

export function JsonPlaygroundPage() {
  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <div className="flex-1 min-h-0 p-3">
        <PaneCodeShell bundle={JSON_BUNDLE} storageKey={STORAGE_KEY} />
      </div>
    </div>
  )
}
