/**
 * Shared console entry type and helpers used by both the Playground page
 * and the Source Map Explorer page.
 *
 * Kept separate from store files so it can be imported without pulling in
 * any Zustand state.
 */

/** A single diagnostic entry for display in a ConsolePanel. */
export interface ConsoleEntry {
  id: string
  severity: 'error' | 'warning' | 'info'
  /** Short machine-readable code, e.g. "INVALID_NESTING". */
  code: string
  /** Human-readable description. */
  message: string
  /** Source location (1-based). */
  loc?: { line: number; col: number }
  /** Optional actionable fix suggestion. */
  fix?: string
  timestamp: number
}

let _counter = 0

/** Convert raw mailc issue objects into ConsoleEntry records. */
export function issuesToEntries(
  issues: Array<{
    code: string
    message: string
    severity: string
    loc?: { line: number; col: number }
    fix?: string
  }>,
): ConsoleEntry[] {
  return issues.map((issue) => ({
    id: `ce-${++_counter}`,
    severity: issue.severity as ConsoleEntry['severity'],
    code: issue.code,
    message: issue.message,
    loc: issue.loc,
    fix: issue.fix,
    timestamp: Date.now(),
  }))
}

/** Build a single error entry from an exception message. */
export function exceptionEntry(message: string): ConsoleEntry {
  return {
    id: `ce-${++_counter}`,
    severity: 'error',
    code: 'COMPILE_EXCEPTION',
    message,
    timestamp: Date.now(),
  }
}
