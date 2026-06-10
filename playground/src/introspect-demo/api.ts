/**
 * Thin async-loaded wrapper around mailc's `introspect` and `parse` exports.
 *
 * The browser bundle is heavy (~220KB), so we lazy-load it on first use.
 *
 * Plugin/marketplace components are deliberately NOT registered here — the
 * introspect demo surfaces only the built-in `mc-*` components.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mod: any = null

async function load() {
  if (mod) return mod
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m: any = await import('mailc/browser')
  mod = {
    introspect: m.introspect ?? m.default?.introspect,
    parse: m.parse ?? m.default?.parse,
    tokenize: m.tokenize ?? m.default?.tokenize,
  }
  if (!mod.introspect) throw new Error('mailc.introspect not found')
  if (!mod.parse) throw new Error('mailc.parse not found')
  if (!mod.tokenize) throw new Error('mailc.tokenize not found')
  return mod
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getIntrospect(): Promise<any> {
  return (await load()).introspect
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseTemplate(source: string): Promise<any> {
  const { parse, tokenize } = await load()
  return parse(tokenize(source))
}

// ---------------------------------------------------------------------------
// Convenience: synchronously available types we expose to the UI
// ---------------------------------------------------------------------------

export interface ComponentSpec {
  type: string
  description: string
  category: string
  /**
   * Reserved for future plugin discovery. Always undefined for now —
   * `introspect.all()` enumerates built-ins only; plugins are per-call
   * values with no global identity. UI branches gated on this flag
   * intentionally never render today.
   */
  isPlugin?: boolean
  allowedParents: string[]
  allowedChildren: string[]
  allowsTextContent: boolean
  acceptsClassAttribute: boolean
  validClassCategories: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requiredAttributes: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optionalAttributes: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cssPropertyAttributes: any[]
  compilesTo: {
    outputElements: string[]
    reason: string
    annotatedExample: { input: string; output: string }
  }
  example: {
    markup: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    node: any
  }
  commonMistakes: string[]
}

export interface IntrospectError {
  code: string
  message: string
  fix: {
    action: string
    description: string
    confidence: 'high' | 'low'
    wrapWith?: string
    attribute?: string
    value?: string
    oldValue?: string
    removeClass?: string
    classHint?: string
  }
}

export interface IntrospectWarning {
  code: string
  message: string
  fix: IntrospectError['fix']
}

export interface ValidationResult {
  valid: boolean
  errors: IntrospectError[]
  warnings: IntrospectWarning[]
}

export interface DataContractField {
  path: string
  usedIn: string
  loopScope?: string
  condition?: string
}

export interface DataContractLoop {
  variable: string
  source: string
  usedPaths: string[]
}

export interface DataContract {
  required: DataContractField[]
  optional: DataContractField[]
  loops: DataContractLoop[]
}
