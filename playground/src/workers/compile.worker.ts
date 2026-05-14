/**
 * Compile Web Worker — runs mailc `compile()` off the main thread so the
 * playground UI never freezes during live editing.
 */
import { compile } from 'mailc'
import type { CompileWorkerRequest, CompileWorkerResponse } from './compile-worker-types'

self.onmessage = (event: MessageEvent<CompileWorkerRequest>) => {
  const { source, id } = event.data
  const start = performance.now()

  try {
    const result = compile(source, { templateStyle: 'class' })
    const timeMs = Math.round((performance.now() - start) * 100) / 100
    const response: CompileWorkerResponse = {
      id,
      ok: true,
      html: result.html,
      partial: result.partial,
      errors: result.errors,
      warnings: result.warnings,
      info: result.info,
      timeMs,
    }
    self.postMessage(response)
  } catch (err) {
    const timeMs = Math.round((performance.now() - start) * 100) / 100
    const response: CompileWorkerResponse = {
      id,
      ok: false,
      html: null,
      partial: false,
      errors: [{
        code: 'COMPILE_EXCEPTION',
        message: err instanceof Error ? err.message : String(err),
        severity: 'error',
      }],
      warnings: [],
      info: [],
      timeMs,
    }
    self.postMessage(response)
  }
}
