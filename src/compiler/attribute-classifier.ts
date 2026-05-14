/**
 * Attribute classifier — runs CSS-property attributes through the same
 * SAFE/ENHANCE/BREAKING/NO_EFFECT classifier the Tailwind path uses.
 *
 * **Why this exists.** Each component compiler reads CSS property values
 * out of `attributes` (e.g. `attributes['border-radius']`) and inlines
 * them straight into the output `style=""`. The Tailwind class path goes
 * through `inlineCSS()` which classifies and strips ENHANCE in strict mode
 * and BREAKING/NO_EFFECT in both modes — the direct-attribute path
 * historically did neither. Result: `class="rounded-lg"` was correctly
 * stripped in strict mode, but `border-radius="8px"` slipped through.
 *
 * This helper closes that gap. Component compilers call
 * {@link filterAttributesByCompatibility} once, right after they resolve
 * effective attributes, and the rest of the compiler reads from the
 * filtered map — no other change needed.
 *
 * Filtering rules (mirror `inlineCSS`):
 * - **SAFE** — kept.
 * - **ENHANCE** — kept in `liberal` mode, stripped in `strict` mode (with
 *   `ENHANCE_PROPERTY_STRIPPED` warning).
 * - **BREAKING** — stripped in both modes (with `BREAKING_CSS` warning).
 * - **NO_EFFECT** — stripped in both modes (with `NO_EFFECT_CSS` warning).
 *
 * @module compiler/attribute-classifier
 */

import type { CompileContext, MCIssue } from '../types.js';
import { COMPONENT_METADATA } from '../components/metadata.js';
import { classifyProperty } from '../css/classifier.js';
import { ErrorCode } from '../errors/codes.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Filters direct CSS-property attributes against the active classification
 * map and compatibility mode, mirroring the strip-and-warn behaviour the
 * Tailwind class path applies via `inlineCSS()`.
 *
 * Only attributes whose metadata flags `isCssPropAttr: true` are
 * considered — structural attrs (`href`, `src`, `align`, `width` on
 * `<img>`, etc.) are passed through untouched. mailc-specific attrs
 * (`inner-background-color`, `mc-class`, `id`) are also passed through.
 *
 * Pure: returns a new attribute map; the input is never mutated.
 * Pushes warnings to `context.warnings` for any property that gets stripped.
 *
 * @param type       - Component type, e.g. `"mc-column"`.
 * @param attributes - The merged attribute map from `getEffectiveAttributes()`.
 * @param context    - Compile context (provides classification map and mode).
 * @returns A new attribute map with disallowed CSS-property attrs removed.
 */
export function filterAttributesByCompatibility(
  type: string,
  attributes: Record<string, string>,
  context: CompileContext,
): Record<string, string> {
  const meta = COMPONENT_METADATA[type];
  if (!meta) return attributes;

  const filtered: Record<string, string> = { ...attributes };
  const mode = context.compatibilityMode;
  const warnings: MCIssue[] = [];

  for (const [name, value] of Object.entries(attributes)) {
    const attrMeta = meta.attributes[name];
    if (!attrMeta?.isCssPropAttr) continue;

    const classification = classifyProperty(
      { property: name, value },
      context.classificationMap,
    );

    if (classification === 'BREAKING') {
      delete filtered[name];
      warnings.push({
        code: ErrorCode.BREAKING_CSS,
        message:
          `"${name}: ${value}" breaks layout in target email clients and has been stripped. ` +
          `Remove the attribute or pick a value that all target clients support.`,
        severity: 'warning',
      });
      continue;
    }

    if (classification === 'NO_EFFECT') {
      delete filtered[name];
      warnings.push({
        code: ErrorCode.NO_EFFECT_CSS,
        message: `"${name}" has no effect in email clients and has been stripped.`,
        severity: 'warning',
      });
      continue;
    }

    if (classification === 'ENHANCE' && mode === 'strict') {
      delete filtered[name];
      warnings.push({
        code: ErrorCode.ENHANCE_PROPERTY_STRIPPED,
        message:
          `"${name}" is not supported by all target clients and has been stripped (compatibilityMode: 'strict'). ` +
          `Switch to compatibilityMode: 'liberal' to allow graceful degradation instead.`,
        severity: 'warning',
      });
    }
    // SAFE → keep. ENHANCE in liberal mode → keep (graceful degradation).
  }

  if (warnings.length > 0) {
    context.warnings.push(...warnings);
  }

  return filtered;
}
