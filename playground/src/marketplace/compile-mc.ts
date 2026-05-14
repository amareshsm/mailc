/**
 * Thin wrapper around `mailc/browser` for the marketplace route.
 *
 * Importing this module also pulls in each brand's design-system module,
 * which registers their `<brand>-*` plugin components at module load
 * (before any `compile()` runs).
 */

import './mailc-essentials-design-system'
import './acme-design-system'
import './kicks-design-system'
import './ecom-design-system'
import './auto-design-system'
import './glow-design-system'

interface CompileResult {
  html: string
  errors: string[]
  warnings: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mailcModule: any = null

async function getMailc(): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (src: string, opts?: Record<string, unknown>) => any
}> {
  if (!mailcModule) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import('mailc/browser')
    const compile = mod.compile ?? mod.default?.compile
    if (!compile) throw new Error('mailc compile() not found in browser bundle')
    mailcModule = { compile }
  }
  return mailcModule
}

export async function compileMC(source: string): Promise<CompileResult> {
  try {
    const { compile } = await getMailc()
    const result = compile(source, { templateStyle: 'attribute' })
    return {
      html: result.html ?? '',
      errors: (result.errors ?? []).map(
        (e: { message: string }) => e.message,
      ),
      warnings: (result.warnings ?? []).map(
        (w: { message: string }) => w.message,
      ),
    }
  } catch (err) {
    return {
      html: '',
      errors: [String(err)],
      warnings: [],
    }
  }
}
