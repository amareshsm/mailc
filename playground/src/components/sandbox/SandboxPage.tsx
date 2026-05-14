import { useEffect, useRef } from 'react'
import { useSandboxStore, issuesToEntries } from '@/store/sandbox-store'
import { markupToJSON } from 'mailc'
import { SandboxCodeEditor } from './SandboxCodeEditor'
import { SandboxPreview } from './SandboxPreview'
import { SandboxConsole } from './SandboxConsole'
import type { CompileWorkerResponse } from '@/workers/compile-worker-types'

// Vite's ?worker import — runs compile() in a separate thread so the UI
// never freezes during live editing.
import CompileWorker from '@/workers/compile.worker?worker'

/** Monotonically increasing id — lets us discard stale worker responses. */
let requestId = 0

export function SandboxPage() {
  const {
    markupCode,
    format,
    setCompiledHtml,
    setCompileTimeMs,
    setConsoleEntries,
    setJsonCode,
  } = useSandboxStore()

  const workerRef = useRef<Worker | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestIdRef = useRef(0)

  // Spin up the worker once on mount, tear it down on unmount.
  useEffect(() => {
    const worker = new CompileWorker()
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<CompileWorkerResponse>) => {
      const res = event.data
      // Discard responses that arrived out of order
      if (res.id < latestIdRef.current) return

      setCompiledHtml(res.html)
      setCompileTimeMs(res.timeMs)
      setConsoleEntries([
        ...issuesToEntries(res.errors),
        ...issuesToEntries(res.warnings),
        ...issuesToEntries(res.info),
      ])
    }

    return () => {
      worker.terminate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced compilation — sends work to the off-thread worker.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      if (!workerRef.current) return
      const id = ++requestId
      latestIdRef.current = id
      workerRef.current.postMessage({ id, source: markupCode })
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [markupCode, format])

  // Sync markup → JSON when switching to JSON tab
  useEffect(() => {
    if (format === 'json' && markupCode.trim()) {
      try {
        const tree = markupToJSON(markupCode)
        setJsonCode(JSON.stringify(tree, null, 2))
      } catch {
        // Leave JSON as-is if conversion fails
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format])

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Code editor */}
      <div className="w-[45%] flex flex-col border-r border-border shrink-0">
        <SandboxCodeEditor />
      </div>

      {/* Right: Preview + Console */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <SandboxPreview />
        <SandboxConsole />
      </div>
    </div>
  )
}
