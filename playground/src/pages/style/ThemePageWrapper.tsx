/**
 * Wraps the existing ThemePlayground with an honest framing banner.
 *
 * The framing makes explicit what theming actually looks like in mailc's
 * two styling modes — class mode has token resolution, attribute mode has
 * mc-attributes-based defaults. Visitors learn the trade-off without
 * having to dig through docs.
 */

import { useState } from 'react'
import { ThemePlayground } from '@/components/theme-playground/ThemePlayground'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Info, X } from 'lucide-react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'mailc-theme-banner-dismissed'

export function ThemePageWrapper(): JSX.Element {
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === '1'
  )

  const dismiss = (): void => {
    setDismissed(true)
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore localStorage failures
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top strip — breadcrumbs + page label */}
      <div className="px-4 py-2 border-b border-border bg-card flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Breadcrumbs
            segments={[
              { label: 'Style', to: '/style' },
              { label: 'Theme & Tokens' },
            ]}
          />
        </div>
        {!dismissed && (
          <button
            onClick={dismiss}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Hide explainer
          </button>
        )}
      </div>

      {/* Honest framing banner */}
      {!dismissed && (
        <div className="px-4 py-3 border-b border-border bg-surface/40 shrink-0">
          <div className="flex items-start gap-3 max-w-5xl">
            <Info className="h-4 w-4 text-foreground/50 shrink-0 mt-0.5" />
            <div className="flex-1 text-[12px] text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">How theming works in mailc:</span>{' '}
              In <span className="text-foreground font-medium">class mode</span>, theme tokens
              resolve through Tailwind utilities (
              <code className="font-mono text-[11px] bg-card border border-border px-1 rounded">bg-brand</code>
              ,
              <code className="font-mono text-[11px] bg-card border border-border px-1 rounded ml-1">text-md</code>
              ) — the rich version. In{' '}
              <span className="text-foreground font-medium">attribute mode</span> (default),
              there's no token resolution; instead you set brand defaults globally with{' '}
              <code className="font-mono text-[11px] bg-card border border-border px-1 rounded">&lt;mc-attributes&gt;</code>
              {' '}or named bundles via{' '}
              <code className="font-mono text-[11px] bg-card border border-border px-1 rounded">&lt;mc-class&gt;</code>
              . The playground below uses class mode for live token editing.{' '}
              <Link to="/style/modes" className="text-foreground underline hover:no-underline">
                See the side-by-side comparison →
              </Link>
            </div>
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mount the original playground */}
      <ThemePlayground />
    </div>
  )
}
