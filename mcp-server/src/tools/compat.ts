/**
 * `check_email_client_support` MCP tool — wraps mailc's `checkCss()`.
 *
 * Validates a CSS declaration string against caniemail's per-client support
 * data. AI agents call this BEFORE shipping a draft to surface
 * "won't render in Outlook 2019" issues that would otherwise hit production.
 */

import { z } from 'zod'
import { checkCss } from 'mailc'

export const checkEmailClientSupportInput = {
  css: z
    .string()
    .describe(
      'CSS declarations string to check, e.g. "display: flex; gap: 16px; background-image: url(...)". Use the `style=` body of any element you intend to ship.',
    ),
  targetClients: z
    .array(z.string())
    .optional()
    .describe(
      "Caniemail client glob patterns to test against. Defaults to ['*'] (all clients). Common picks: ['gmail.*', 'outlook.*', 'apple-mail.*', 'yahoo.*'].",
    ),
}

export async function checkEmailClientSupportHandler(args: {
  css: string
  targetClients?: string[]
}) {
  const clients = args.targetClients ?? ['*']
  const result = checkCss(args.css, clients)

  return {
    success: result.success,
    targetClients: clients,
    issueCount: result.issues.length,
    issues: result.issues.map((i) => ({
      property: i.property,
      message: i.message,
      severity: i.severity,
      affectedClients: i.affectedClients,
      notes: i.notes,
    })),
  }
}
