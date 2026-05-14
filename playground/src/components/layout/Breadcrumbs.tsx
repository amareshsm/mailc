/**
 * Breadcrumb trail used at the top of deep routes (sub-bucket pages).
 *
 * Pass an explicit array of segments — kept dumb on purpose so each page
 * controls labels rather than inferring from URL slugs.
 */

import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbSegment {
  label: string
  to?: string
}

export function Breadcrumbs({ segments }: { segments: BreadcrumbSegment[] }): JSX.Element {
  return (
    <nav className="flex items-center gap-1 text-[11px] text-muted-foreground" aria-label="Breadcrumb">
      <Link to="/" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
        <Home className="h-3 w-3" />
      </Link>
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          {seg.to && i < segments.length - 1 ? (
            <Link to={seg.to} className="hover:text-foreground transition-colors">
              {seg.label}
            </Link>
          ) : (
            <span className={i === segments.length - 1 ? 'text-foreground font-medium' : ''}>
              {seg.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
