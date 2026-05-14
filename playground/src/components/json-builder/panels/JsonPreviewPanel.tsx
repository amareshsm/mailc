import { useJsonBuilderStore } from '@/store/json-builder-store'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'

export function JsonPreviewPanel() {
  const compiledHtml = useJsonBuilderStore((s) => s.compiledHtml)
  const compiledErrors = useJsonBuilderStore((s) => s.compiledErrors)
  const compiledWarnings = useJsonBuilderStore((s) => s.compiledWarnings)
  const compiling = useJsonBuilderStore((s) => s.compiling)

  const errorCount = compiledErrors.length
  const warningCount = compiledWarnings.length

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      {(errorCount > 0 || warningCount > 0) && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-surface text-xs">
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertCircle className="h-3 w-3" />
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-yellow-500">
              <AlertTriangle className="h-3 w-3" />
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Preview area */}
      {compiledHtml ? (
        <iframe
          className="flex-1 w-full border-0"
          srcDoc={compiledHtml}
          sandbox="allow-same-origin"
          title="Email preview"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          {compiling ? (
            <>
              <div className="animate-spin h-6 w-6 rounded-full border-2 border-border border-t-foreground" />
              <span className="text-sm">Compiling…</span>
            </>
          ) : errorCount > 0 ? (
            <>
              <AlertCircle className="h-8 w-8 text-red-400" />
              <div className="text-center max-w-xs">
                <p className="text-sm font-medium text-foreground mb-1">Compilation failed</p>
                <div className="space-y-1">
                  {compiledErrors.slice(0, 3).map((err, i) => (
                    <p key={i} className="text-xs text-red-500">
                      [{err.code}] {err.message}
                    </p>
                  ))}
                  {compiledErrors.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      …and {compiledErrors.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <Info className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm">Add components to see the preview</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
