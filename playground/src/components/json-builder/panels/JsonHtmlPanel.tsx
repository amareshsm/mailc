import { useJsonBuilderStore } from '@/store/json-builder-store'
import { Copy, Check, Code2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code-block'

export function JsonHtmlPanel() {
  const compiledHtml = useJsonBuilderStore((s) => s.compiledHtml)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!compiledHtml) return
    await navigator.clipboard.writeText(compiledHtml)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!compiledHtml) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Code2 className="h-8 w-8 opacity-30" />
        <p className="text-sm">No compiled HTML yet</p>
      </div>
    )
  }

  const lineCount = compiledHtml.split('\n').length

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface shrink-0">
        <span className="text-xs text-muted-foreground">
          {lineCount} lines · {(compiledHtml.length / 1024).toFixed(1)} KB
        </span>
        <Button variant="ghost" size="icon-sm" onClick={handleCopy} title="Copy HTML">
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <CodeBlock code={compiledHtml} language="markup" />
      </div>
    </div>
  )
}
