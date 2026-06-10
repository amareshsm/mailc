/**
 * Thin wrapper around `mailc/browser` for the marketplace route.
 *
 * Each design-system module exports a `PLUGINS` array of plugin values
 * (the result of `defineComponent()` calls). This wrapper concatenates
 * them and passes the full set to every compile via `{ plugins }`. No
 * module-load side effects.
 */

import { MAILC_ESSENTIALS_PLUGINS } from './mailc-essentials-design-system'
import { ACME_PLUGINS } from './acme-design-system'
import { KICKS_PLUGINS } from './kicks-design-system'
import { ECOM_PLUGINS } from './ecom-design-system'
import { AUTO_PLUGINS } from './auto-design-system'
import { GLOW_PLUGINS } from './glow-design-system'

// All marketplace plugin values, merged once on module load.
const ALL_PLUGINS = [
  ...MAILC_ESSENTIALS_PLUGINS,
  ...ACME_PLUGINS,
  ...KICKS_PLUGINS,
  ...ECOM_PLUGINS,
  ...AUTO_PLUGINS,
  ...GLOW_PLUGINS,
]

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
    const result = compile(source, {
      templateStyle: 'attribute',
      plugins: ALL_PLUGINS,
    })
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
