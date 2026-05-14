/**
 * Shared message types for the JSON compile Web Worker.
 */

import type { WorkerIssue } from './compile-worker-types'

/** Message sent TO the JSON compile worker. */
export interface JsonCompileWorkerRequest {
  /** Monotonically increasing request id — lets us discard stale responses. */
  id: number
  /** The MCNode tree to compile. */
  node: unknown
  options: {
    theme?: { extend?: { colors?: Record<string, string> } }
    data?: Record<string, unknown>
    sourceMap: boolean
    templateStyle: 'class'
  }
}

/** Message received FROM the JSON compile worker. */
export interface JsonCompileWorkerResponse {
  /** Echoed request id — discard if older than the latest sent. */
  id: number
  ok: boolean
  html: string | null
  partial: boolean
  errors: WorkerIssue[]
  warnings: WorkerIssue[]
  info: WorkerIssue[]
  sourceMap: unknown | null
  sourceMapJSON: string | null
  stats: {
    inputSize: number
    outputSize: number
    compileTime: number
    components: number
  } | null
}
