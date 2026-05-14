/**
 * JSON Compile Web Worker — runs mailc `compileFromJSON()` off the main
 * thread so the JSON builder UI never freezes during live editing.
 */
import { compileFromJSON } from 'mailc'
import type { JsonCompileWorkerRequest, JsonCompileWorkerResponse } from './json-compile-worker-types'

self.onmessage = (event: MessageEvent<JsonCompileWorkerRequest>) => {
  const { node, id, options } = event.data

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = compileFromJSON(node as any, {
      templateStyle: options.templateStyle,
      sourceMap: options.sourceMap,
      ...(options.theme ? { theme: options.theme } : {}),
      ...(options.data ? { data: options.data } : {}),
    })

    const response: JsonCompileWorkerResponse = {
      id,
      ok: result.errors.length === 0 && result.html !== null,
      html: result.html,
      partial: result.partial,
      errors: result.errors,
      warnings: result.warnings,
      info: result.info,
      sourceMap: result.sourceMap ?? null,
      sourceMapJSON: result.sourceMapJSON ?? null,
      stats: result.stats
        ? {
            inputSize: result.stats.inputSize,
            outputSize: result.stats.outputSize,
            compileTime: result.stats.compileTime,
            components: result.stats.components,
          }
        : null,
    }
    self.postMessage(response)
  } catch (err) {
    const response: JsonCompileWorkerResponse = {
      id,
      ok: false,
      html: null,
      partial: false,
      errors: [
        {
          code: 'COMPILE_EXCEPTION',
          message: err instanceof Error ? err.message : String(err),
          severity: 'error',
        },
      ],
      warnings: [],
      info: [],
      sourceMap: null,
      sourceMapJSON: null,
      stats: null,
    }
    self.postMessage(response)
  }
}
