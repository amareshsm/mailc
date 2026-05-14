import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { getBrand } from '@/marketplace/brands'
import { compileMC } from '@/marketplace/compile-mc'
import { CodeBlock } from '@/components/ui/code-block'

type Pane = 'preview' | 'source' | 'html'

export function MarketplaceEmailDetail() {
  const { brand, slug } = useParams<{ brand: string; slug: string }>()
  const data = brand ? getBrand(brand) : undefined
  const email = data?.emails.find((e) => e.slug === slug)
  const backHref = data ? `/extend/plugins/${data.system.id}/emails` : '/extend/plugins'

  const [pane, setPane] = useState<Pane>('preview')
  const [html, setHtml] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  useEffect(() => {
    if (!email) return
    let cancelled = false
    async function run() {
      const result = await compileMC(email!.source)
      if (cancelled) return
      setHtml(result.html)
      setErrors(result.errors)
      setWarnings(result.warnings)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [email])

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-foreground font-semibold mb-2">Email not found</p>
          <Link
            to={backHref}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to all emails
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <Link
          to={backHref}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          All emails
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground">{email.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {email.description}
            </p>
          </div>

          {/* Pane switcher */}
          <div className="flex items-center gap-0.5 bg-surface rounded-lg p-0.5">
            {(['preview', 'source', 'html'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPane(p)}
                className={`px-3 py-1.5 text-xs uppercase font-mono rounded-md transition-colors ${
                  pane === p
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Diagnostics */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="border-b border-border px-6 py-3 bg-surface/50 shrink-0">
          {errors.map((e, i) => (
            <div
              key={`err-${i}`}
              className="flex items-start gap-2 text-xs text-red-400 mb-1"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{e}</span>
            </div>
          ))}
          {warnings.map((w, i) => (
            <div
              key={`warn-${i}`}
              className="flex items-start gap-2 text-xs text-amber-400 mb-1"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pane content */}
      <div className="flex-1 overflow-auto">
        {pane === 'preview' && (
          <div className="dot-grid-bg min-h-full p-8 flex justify-center">
            <iframe
              title={`${email.slug} rendered preview`}
              srcDoc={html}
              className="bg-white rounded-lg shadow-2xl shadow-black/30"
              style={{ width: '600px', maxWidth: '100%', minHeight: '600px', height: '100%' }}
            />
          </div>
        )}
        {pane === 'source' && (
          <div className="p-6">
            <CodeBlock code={email.source} language="markup" showLineNumbers />
          </div>
        )}
        {pane === 'html' && (
          <div className="p-6">
            <CodeBlock code={html} language="markup" showLineNumbers />
          </div>
        )}
      </div>
    </div>
  )
}
