import { Link, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Layers, Mail } from 'lucide-react'
import { getBrand } from '@/marketplace/brands'

export function MarketplaceBrandDetail() {
  const { brand } = useParams<{ brand: string }>()
  const data = brand ? getBrand(brand) : undefined

  if (!data) return <Navigate to="/extend/plugins" replace />
  const { system, components, emails } = data

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <Link
          to="/extend/plugins"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All brands
        </Link>

        {/* Brand card */}
        <div className="relative mb-10 rounded-xl border border-border bg-card p-6 overflow-hidden">
          <span
            aria-hidden
            className="absolute left-0 top-0 bottom-0 w-0.5"
            style={{ backgroundColor: system.brandColor }}
          />
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground">{system.name}</h1>
              <code className="text-xs text-muted-foreground font-mono">
                {system.publisher}
                <span className="ml-2">v{system.version}</span>
              </code>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4 max-w-2xl leading-relaxed">
            {system.description}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {components.map((c) => (
              <code
                key={c.type}
                className="text-[11px] px-2 py-1 rounded bg-surface border border-border text-foreground font-mono"
              >
                {`<${c.type}>`}
              </code>
            ))}
          </div>
        </div>

        {/* Two-card nav */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to={`/extend/plugins/${system.id}/components`}
            className="group rounded-xl border border-border bg-surface p-6 hover:border-foreground/40 transition-colors"
          >
            <Layers className="h-5 w-5 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">Browse components</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Inspect each component in the design system — attributes, example usage, rendered output.
            </p>
            <span className="text-sm text-foreground font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              View {components.length} component{components.length === 1 ? '' : 's'}{' '}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link
            to={`/extend/plugins/${system.id}/emails`}
            className="group rounded-xl border border-border bg-surface p-6 hover:border-foreground/40 transition-colors"
          >
            <Mail className="h-5 w-5 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">Sample emails</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Real templates authored using only this brand's components — drop in real content and ship.
            </p>
            <span className="text-sm text-foreground font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              View {emails.length} template{emails.length === 1 ? '' : 's'}{' '}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
