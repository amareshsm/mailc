/**
 * `compile_email` MCP tool — wraps mailc's `compile()`.
 *
 * Renders mailc markup (or a JSON IR tree) to email-safe HTML and returns
 * structured errors/warnings. Used by AI agents to verify generated templates
 * compile cleanly before shipping.
 */

import { z } from 'zod'
import { compile, compileFromJSON, type MCNode, type CompileResult } from 'mailc'

export const compileEmailInput = {
  source: z
    .string()
    .optional()
    .describe(
      "mailc markup string (.mc syntax). Provide either `source` or `jsonNode`, not both.",
    ),
  jsonNode: z
    .unknown()
    .optional()
    .describe(
      'mailc JSON IR root node — typically `{ type: "mc", attributes: {}, children: [...] }`. Provide either `source` or `jsonNode`.',
    ),
  templateStyle: z
    .enum(['attribute', 'class'])
    .optional()
    .describe(
      "Styling mode. Default 'attribute' accepts CSS-property attributes (color=, padding=). 'class' (limited support) bans them and expects Tailwind-style class= utilities.",
    ),
  compatibilityMode: z
    .enum(['liberal', 'strict'])
    .optional()
    .describe(
      "Email compatibility mode. 'liberal' (default) inlines ENHANCE properties (rounded corners, shadows, opacity) for graceful degradation. 'strict' strips them and emits ENHANCE_PROPERTY_STRIPPED warnings — pixel-identical rendering across all target clients, suitable for B2B / Outlook-heavy audiences.",
    ),
  data: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Template data for {{variable}} interpolation, mc-if conditions, and mc-each loops. Optional.',
    ),
}

interface CompileToolResult {
  html: string | null
  errors: Array<{ code: string; message: string; severity: string }>
  warnings: Array<{ code: string; message: string; severity: string }>
  partial: boolean
  stats?: CompileResult['stats']
}

export async function compileEmailHandler(args: {
  source?: string
  jsonNode?: unknown
  templateStyle?: 'attribute' | 'class'
  compatibilityMode?: 'liberal' | 'strict'
  data?: Record<string, unknown>
}): Promise<CompileToolResult> {
  const { source, jsonNode, templateStyle, compatibilityMode, data } = args

  if (source && jsonNode) {
    throw new Error('Provide either `source` or `jsonNode`, not both.')
  }
  if (!source && !jsonNode) {
    throw new Error('Provide either `source` (markup string) or `jsonNode` (JSON IR).')
  }

  const opts: Parameters<typeof compile>[1] = {}
  if (templateStyle) opts.templateStyle = templateStyle
  if (compatibilityMode) opts.compatibilityMode = compatibilityMode
  if (data) opts.data = data

  const result = source
    ? compile(source, opts)
    : compileFromJSON(jsonNode as MCNode, opts)

  return {
    html: result.html,
    errors: result.errors.map((e) => ({
      code: e.code,
      message: e.message,
      severity: e.severity,
    })),
    warnings: result.warnings.map((w) => ({
      code: w.code,
      message: w.message,
      severity: w.severity,
    })),
    partial: result.partial,
    stats: result.stats,
  }
}
