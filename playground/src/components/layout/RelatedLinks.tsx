/**
 * Related links footer — small cross-page discovery component.
 *
 * Drop at the bottom of any feature page to point visitors at the next
 * useful thing. Kept text-only to stay light and not compete with the
 * main page content.
 */

import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export interface RelatedLink {
  to: string
  label: string
  description?: string
}

export function RelatedLinks({
  title = 'Related',
  links,
}: {
  title?: string
  links: RelatedLink[]
}): JSX.Element {
  return (
    <section className="mt-12 border-t border-border pt-6">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group rounded-md border border-border bg-card hover:bg-surface transition-colors px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-foreground">{link.label}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
            {link.description && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">{link.description}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
