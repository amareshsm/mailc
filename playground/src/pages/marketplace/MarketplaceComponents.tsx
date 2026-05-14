import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, Package } from 'lucide-react'
import { getBrand, type BrandComponentSpec } from '@/marketplace/brands'
import { compileMC } from '@/marketplace/compile-mc'
import { CodeBlock } from '@/components/ui/code-block'

function ComponentPreview({ spec }: { spec: BrandComponentSpec }) {
  const [html, setHtml] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const wrapped = `<mc><mc-body>${spec.example}</mc-body></mc>`
      const result = await compileMC(wrapped)
      if (cancelled) return
      if (result.errors.length > 0) {
        setError(result.errors.join('; '))
      } else {
        setHtml(result.html)
        setError(null)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [spec.example])

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <h3 className="text-base font-semibold text-foreground">{spec.label}</h3>
          <code className="text-[11px] px-2 py-0.5 rounded bg-background border border-border text-foreground font-mono">
            {`<${spec.type}>`}
          </code>
        </div>
        <p className="text-sm text-muted-foreground">{spec.tagline}</p>
      </div>

      <div className="px-5 py-3 bg-background/50 border-b border-border">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
          Markup
        </div>
        <CodeBlock code={spec.example} language="markup" />
      </div>

      <div className="px-5 py-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Rendered
        </div>
        {error ? (
          <div className="text-xs text-red-400 p-3 bg-red-950/20 border border-red-800/30 rounded-lg">
            {error}
          </div>
        ) : (
          <iframe
            title={`${spec.type} preview`}
            srcDoc={html}
            className="w-full bg-white rounded-lg border border-border"
            style={{ minHeight: '180px', height: '320px' }}
          />
        )}
      </div>
    </div>
  )
}

export function MarketplaceComponents() {
  const { brand } = useParams<{ brand: string }>()
  const data = brand ? getBrand(brand) : undefined

  if (!data) return <Navigate to="/extend/plugins" replace />
  const { system, components } = data

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
            <Package className="h-3.5 w-3.5" />
            <span>{system.publisher}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
            Components
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Each card shows the component's markup and rendered output.
            Plugins are registered via{' '}
            <code className="text-[12px] font-mono">defineComponent()</code> and participate
            in mailc's normal compile/validation pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {components.map((spec) => (
            <ComponentPreview key={spec.type} spec={spec} />
          ))}
        </div>
      </div>
    </div>
  )
}
