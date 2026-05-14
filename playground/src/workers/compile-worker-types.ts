/**
 * Shared message types for the compile Web Worker.
 */

/** Message sent TO the worker. */
export interface CompileWorkerRequest {
  /** Monotonically increasing request id — lets us discard stale responses. */
  id: number
  /** Raw mailc markup source to compile. */
  source: string
}

/** Minimal shape of a mailc issue (mirrors MCIssue from mailc). */
export interface WorkerIssue {
  code: string
  message: string
  severity: 'error' | 'warning' | 'info'
  /** Mirrors MCIssue.loc — flat { line, col, file? } shape. */
  loc?: { line: number; col: number; file?: string }
  fix?: string
}

/** Message received FROM the worker. */
export interface CompileWorkerResponse {
  /** Echoed request id — discard if older than the latest sent. */
  id: number
  ok: boolean
  html: string | null
  /**
   * `true` when `html` was produced despite one or more validation errors.
   * The UI can use this to show an error banner in the preview.
   */
  partial: boolean
  errors: WorkerIssue[]
  warnings: WorkerIssue[]
  info: WorkerIssue[]
  timeMs: number
}
