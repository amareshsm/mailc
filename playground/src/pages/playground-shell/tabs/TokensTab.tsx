/**
 * Tokens tab — renders the bundle's TokensComponent. The markup playground
 * binds `TokensPanel` (markup store), the JSON playground binds
 * `JsonTokensPanel` (json store) — see `playground-context.tsx`.
 */
import { usePlayground } from '../playground-context'

export function TokensTab() {
  const { TokensComponent } = usePlayground()
  return (
    <div className="h-full overflow-hidden bg-card">
      <TokensComponent />
    </div>
  )
}
