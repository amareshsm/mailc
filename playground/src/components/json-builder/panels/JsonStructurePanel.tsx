import { useJsonBuilderStore } from '@/store/json-builder-store'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function JsonStructurePanel() {
  // Subscribe to fields buildMCDocument() reads so this panel re-renders on change.
  useJsonBuilderStore((s) => s.nodes)
  useJsonBuilderStore((s) => s.emailTitle)
  useJsonBuilderStore((s) => s.emailPreview)
  const buildMCDocument = useJsonBuilderStore((s) => s.buildMCDocument)
  const [copied, setCopied] = useState(false)

  const doc = buildMCDocument()
  const json = JSON.stringify(doc, null, 2)
  const lineCount = json.split('\n').length

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface shrink-0">
        <span className="text-xs text-muted-foreground">
          {lineCount} lines · {(json.length / 1024).toFixed(1)} KB
        </span>
        <Button variant="ghost" size="icon-sm" onClick={handleCopy} title="Copy JSON">
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="p-3 text-xs font-mono leading-relaxed whitespace-pre text-foreground">
          <JsonHighlight json={json} />
        </pre>
      </div>
    </div>
  )
}

/** Minimal JSON syntax highlighter using spans. */
function JsonHighlight({ json }: { json: string }) {
  // Replace known token types with colored spans
  const highlighted = json
    .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="text-blue-400">$1</span>$2') // keys
    .replace(
      /:\s*("(?:[^"\\]|\\.)*")/g,
      ': <span class="text-green-400">$1</span>'
    ) // string values
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="text-yellow-400">$1</span>') // numbers
    .replace(/:\s*(true|false|null)/g, ': <span class="text-purple-400">$1</span>') // keywords

  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />
}
