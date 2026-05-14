import { Link } from 'react-router-dom'
import { Package, ArrowRight } from 'lucide-react'
import { BRANDS } from '@/marketplace/brands'

const CATEGORY_LABEL: Record<string, string> = {
  saas: 'SaaS',
  shoe: 'Footwear',
  ecommerce: 'E-commerce',
  automotive: 'Automotive',
  beauty: 'Beauty',
  newsletter: 'Newsletter',
}

export function MarketplaceLanding() {
  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-3">
            <Package className="h-3.5 w-3.5" />
            <span>Component Marketplace</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
            Branded email components, shipped as packages.
          </h1>
          <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
            Companies publish their own component libraries on top of mailc.
            Drop them into any template — your brand, your design tokens,
            email-client compatibility baked in. Pick a brand below to inspect
            its components and sample emails.
          </p>
        </div>

        {/* Brand grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BRANDS.map(({ system, components, emails }) => (
            <Link
              key={system.id}
              to={`/extend/plugins/${system.id}`}
              className="group relative rounded-xl border border-border bg-card p-6 hover:border-foreground/30 hover:bg-surface transition-colors overflow-hidden"
            >
              {/* Subtle accent bar — single thin line, brand-colored, no big block */}
              <span
                aria-hidden
                className="absolute left-0 top-0 bottom-0 w-0.5"
                style={{ backgroundColor: system.brandColor }}
              />

              <div className="mb-3 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <code className="text-sm font-mono font-semibold text-foreground">
                    {system.publisher}
                  </code>
                  <span className="ml-2 text-xs text-muted-foreground font-mono">
                    v{system.version}
                  </span>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded text-muted-foreground bg-surface border border-border">
                  {CATEGORY_LABEL[system.category] ?? system.category}
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                {system.description}
              </p>

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                <span className="font-mono">
                  {components.length} component{components.length === 1 ? '' : 's'} ·{' '}
                  {emails.length} template{emails.length === 1 ? '' : 's'}
                </span>
                <span className="text-foreground font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Explore <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Why card */}
        <div className="mt-12 rounded-xl border border-border bg-surface/50 p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
            Why this matters
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li>
              <span className="text-foreground font-medium">Plugin API.</span>{' '}
              Components register at runtime via{' '}
              <code className="text-[12px] px-1 py-0.5 rounded bg-background border border-border font-mono">
                defineComponent()
              </code>
              . No fork of mailc required.
            </li>
            <li>
              <span className="text-foreground font-medium">Self-describing.</span>{' '}
              Each component carries metadata — attributes, types, examples.
              IDEs and AI agents can read it programmatically.
            </li>
            <li>
              <span className="text-foreground font-medium">Email-client safe.</span>{' '}
              Components emit table-based, inline-styled HTML that works in
              Outlook, Gmail, Apple Mail.
            </li>
            <li>
              <span className="text-foreground font-medium">Distributable.</span>{' '}
              Ship as an npm package. Your brand flows from design tokens to
              inbox without copy-paste.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
