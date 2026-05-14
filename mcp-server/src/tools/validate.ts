/**
 * `validate_email_node` MCP tool — wraps `introspect.validate()`.
 *
 * Pre-flight check for a single JSON IR node. Returns structured FixInstruction
 * objects so AI agents can self-correct without parsing prose error messages.
 */

import { z } from 'zod'
import { introspect } from 'mailc'

export const validateNodeInput = {
  node: z
    .object({
      type: z.string().describe('Component type, e.g. "mc-button"'),
      attributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Attribute name → value map'),
      children: z.array(z.unknown()).optional(),
      content: z.string().optional(),
    })
    .passthrough()
    .describe('The JSON IR node to validate.'),
  parentType: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Parent component type (e.g. "mc-column"). Pass null for a root-level node.',
    ),
  templateStyle: z
    .enum(['attribute', 'class'])
    .optional()
    .describe(
      "Match the templateStyle that compile() will use. Default 'attribute' suppresses CSS_ATTR_IN_CLASS_MODE warnings.",
    ),
}

export async function validateNodeHandler(args: {
  node: { type: string; attributes?: Record<string, string>; children?: unknown[]; content?: string }
  parentType?: string | null
  templateStyle?: 'attribute' | 'class'
}) {
  const { node, parentType = null, templateStyle } = args

  // introspect.validate expects { type, attributes? } at minimum.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = introspect.validate(node as any, parentType as any, {
    templateStyle: templateStyle ?? 'attribute',
  })

  return {
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
  }
}
