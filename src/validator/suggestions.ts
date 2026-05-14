/**
 * "Did you mean?" suggestion engine for the validator.
 *
 * Wraps the fuzzy-match util to produce human-friendly suggestions
 * for unknown component names and attribute names.
 */
import { suggest as baseSuggest } from '../utils/fuzzy-match.js';
import { KNOWN_COMPONENTS, COMPONENT_RULES, GLOBAL_ATTRIBUTES } from './rules.js';

/**
 * Suggests the closest known component name for an unknown tag.
 *
 * Reads the live `KNOWN_COMPONENTS` set on every call so plugin-registered
 * components participate in suggestions automatically.
 *
 * @param unknown - The unknown tag name (e.g. "mc-txt").
 * @returns A suggestion string like `Did you mean "mc-text"?`, or `null`.
 */
export function suggestComponent(unknown: string): string | null {
  return baseSuggest(unknown, Array.from(KNOWN_COMPONENTS)) ?? null;
}

/**
 * Suggests the closest known attribute name for a component.
 *
 * @param attrName - The unknown attribute name (e.g. "hre").
 * @param componentType - The component type (e.g. "mc-button").
 * @returns A suggestion string like `Did you mean "href"?`, or `null`.
 */
export function suggestAttribute(attrName: string, componentType: string): string | null {
  const rule = COMPONENT_RULES[componentType];
  if (!rule) return null;

  const candidates = [...rule.knownAttributes, ...GLOBAL_ATTRIBUTES];
  return baseSuggest(attrName, candidates) ?? null;
}
