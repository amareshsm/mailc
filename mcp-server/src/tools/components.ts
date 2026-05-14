/**
 * `get_component_spec` and `list_components` MCP tools.
 *
 * Expose the introspection registry to AI agents — every component,
 * including plugins registered via `defineComponent()`, is discoverable
 * with full attribute metadata, parent/child rules, and HTML output info.
 */

import { z } from 'zod'
import { introspect } from 'mailc'

// ---------------------------------------------------------------------------
// list_components — no input
// ---------------------------------------------------------------------------

export const listComponentsInput = {}

export async function listComponentsHandler() {
  const all = introspect.all()
  return {
    count: all.length,
    components: all.map((c) => ({
      type: c.type,
      category: c.category,
      description: c.description,
      isPlugin: !c.type.startsWith('mc-'),
    })),
  }
}

// ---------------------------------------------------------------------------
// get_component_spec
// ---------------------------------------------------------------------------

export const getComponentSpecInput = {
  type: z
    .string()
    .describe(
      'Component tag name, e.g. "mc-button" or a registered plugin like "acme-hero".',
    ),
}

export async function getComponentSpecHandler(args: { type: string }) {
  const spec = introspect.component(args.type)
  if (!spec) {
    throw new Error(
      `Unknown component "${args.type}". Call list_components to see all registered types.`,
    )
  }
  return spec
}

// ---------------------------------------------------------------------------
// can_nest — quick parent/child check
// ---------------------------------------------------------------------------

export const canNestInput = {
  parent: z.string().describe('Parent component type, e.g. "mc-column".'),
  child: z.string().describe('Child component type, e.g. "mc-button".'),
}

export async function canNestHandler(args: { parent: string; child: string }) {
  return {
    parent: args.parent,
    child: args.child,
    allowed: introspect.canNest(args.parent, args.child),
  }
}
