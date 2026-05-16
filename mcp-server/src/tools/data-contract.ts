/**
 * `extract_data_contract` MCP tool.
 *
 * Static analysis of a mailc template's data dependencies. Returns required
 * fields, optional fields (gated by mc-if), and per-loop iteration shapes —
 * the basis for typed SDK generation and AI-driven data binding.
 */

import { z } from 'zod'
import { introspect, parse, tokenize } from 'mailc'

export const extractDataContractInput = {
  source: z
    .string()
    .describe(
      'mailc markup string. Expressions ({{var}}), mc-if conditions, and mc-each loops are walked statically — no data is evaluated.',
    ),
}

export async function extractDataContractHandler(args: { source: string }) {
  let ast
  try {
    const tokens = tokenize(args.source)
    ast = parse(tokens)
  } catch (err) {
    throw new Error(
      `Failed to parse template: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  const contract = introspect.dataContract(ast)
  return {
    required: contract.required,
    optional: contract.optional,
    loops: contract.loops,
    summary: {
      requiredCount: contract.required.length,
      optionalCount: contract.optional.length,
      loopCount: contract.loops.length,
    },
  }
}
