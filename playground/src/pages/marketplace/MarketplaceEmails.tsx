import { Link, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react'
import { getBrand, type BrandEmail } from '@/marketplace/brands'

const CATEGORY_STYLES: Record<BrandEmail['category'], string> = {
  lifecycle: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  transactional: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  marketing: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  product: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
}

export function MarketplaceEmails() {
  const { brand } = useParams<{ brand: string }>()
  const data = brand ? getBrand(brand) : undefined

  if (!data) return <Navigate to="/extend/plugins" replace />
  const { system, emails } = data

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          to={`/extend/plugins/${system.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {system.name}
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
            <Mail className="h-3.5 w-3.5" />
            <span>{system.publisher} — sample templates</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
            Emails built from the design system
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Every template uses only this brand's components — no inline styling,
            no copy-pasted markup. Click any email to inspect the source and
            rendered output.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emails.map((email) => (
            <Link
              key={email.slug}
              to={`/extend/plugins/${system.id}/emails/${email.slug}`}
              className="group rounded-xl border border-border bg-surface p-5 hover:border-foreground/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <h3 className="text-base font-semibold text-foreground group-hover:text-foreground">
                  {email.title}
                </h3>
                <span
                  className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${CATEGORY_STYLES[email.category]}`}
                >
                  {email.category}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {email.description}
              </p>
              <div className="flex items-center justify-between">
                <code className="text-[11px] font-mono text-muted-foreground">
                  {email.slug}.mc
                </code>
                <span className="text-sm text-foreground font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Inspect <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
