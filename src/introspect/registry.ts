/**
 * @file src/introspect/registry.ts
 *
 * ComponentSpec registry — derived from the runtime component registry.
 *
 * Every field in ComponentSpec is computed from registered metadata
 * (built-ins seeded at startup + any plugins registered via
 * `defineComponent()`). No strings are hardcoded here. When the registry
 * changes (e.g. a plugin registers a new component), the spec cache is
 * invalidated and rebuilt on next access.
 *
 * Dependency rule: imports from metadata + registry + types only.
 * NEVER imports from compiler/* or calls compile().
 *
 * @module introspect/registry
 */

import type { AttributeMetadata, ComponentMetadata } from '../components/metadata.js';
import { BUILTIN_METADATA } from '../registry/builtin-registry.js';

const getComponentMetadata = (type: string): ComponentMetadata | undefined =>
  BUILTIN_METADATA[type];
const getAllMetadata = (): Record<string, ComponentMetadata> =>
  BUILTIN_METADATA as Record<string, ComponentMetadata>;
import type {
  AttributeSpec,
  ComponentSpec,
  CompilesToSpec,
  ExampleNode,
  ExampleSpec,
} from './types.js';

// ---------------------------------------------------------------------------
// Synthetic-type filter
// ---------------------------------------------------------------------------

/**
 * Synthetic compiler-only types (prefixed with `_`) like `_mc-loop-iteration`
 * are seeded into the registry with placeholder metadata so the compiler
 * dispatch table includes them. They should NEVER appear in introspection
 * output — they're internal implementation details.
 */
function isSyntheticType(type: string): boolean {
  return type.startsWith('_');
}

/**
 * Returns the registered metadata for `type`, or undefined for unknown or
 * synthetic types. Used by all helpers below so the synthetic filter is
 * applied consistently.
 */
function getIntrospectableMetadata(type: string): ComponentMetadata | undefined {
  if (isSyntheticType(type)) return undefined;
  return getComponentMetadata(type);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Converts a metadata attributes map entry into an AttributeSpec by
 * injecting the map key (`name`) into the metadata object.
 *
 * @param name - The attribute name (map key).
 * @param meta - The AttributeMetadata value.
 * @returns A self-contained AttributeSpec.
 */
function toAttributeSpec(name: string, meta: AttributeMetadata): AttributeSpec {
  return { name, ...meta };
}

/**
 * Builds the list of component types that may be direct children of `type`.
 *
 * A component C is a valid child of P when:
 *   - `C.parent === P`, OR
 *   - `C.alternateParents` includes P
 *
 * Reads the live registry so plugin-registered components automatically
 * appear as valid children of built-ins (and vice versa).
 *
 * @param type - The parent component type to look up.
 * @returns Sorted array of child component type strings.
 */
function buildAllowedChildren(type: string): string[] {
  return Object.entries(getAllMetadata())
    .filter(([childType, meta]) => {
      if (isSyntheticType(childType)) return false;
      const directMatch = meta.parent === type;
      const alternateMatch = meta.alternateParents?.includes(type) ?? false;
      return directMatch || alternateMatch;
    })
    .map(([childType]) => childType)
    .sort();
}

/**
 * Builds the list of parent component types that `type` may live inside.
 *
 * The internal `'mc'` document-root type is excluded — it is never a
 * parent an agent or user would explicitly nest inside of.
 *
 * @param type - The child component type.
 * @returns Array of allowed parent type strings. Empty for root-level components.
 */
function buildAllowedParents(type: string): string[] {
  const meta = getIntrospectableMetadata(type);
  if (!meta) return [];
  const parents: string[] = [];
  if (meta.parent !== null && meta.parent !== 'mc') parents.push(meta.parent);
  if (meta.alternateParents) {
    parents.push(...meta.alternateParents.filter(p => p !== 'mc'));
  }
  return parents;
}

/**
 * Generates a minimal valid ExampleSpec for a component.
 *
 * Required attributes get their `example` value as the attribute value.
 * The markup string is built from the required attributes only.
 *
 * @param type - The component type.
 * @returns A minimal ExampleSpec with both node and markup representations.
 */
function buildExample(type: string): ExampleSpec {
  const meta = getIntrospectableMetadata(type);
  if (!meta) throw new Error(`No metadata for component: ${type}`);

  // Build attribute map using example values for required attrs only
  const requiredAttrs = Object.entries(meta.attributes).filter(([, a]) => a.required);
  const attributes: Record<string, string> = {};
  for (const [name, attrMeta] of requiredAttrs) {
    attributes[name] = attrMeta.example;
  }

  const node: ExampleNode = {
    type,
    attributes,
    ...(meta.allowsTextContent ? { content: meta.description.split('.')[0] ?? '' } : {}),
  };

  // Build markup string
  const attrStr = requiredAttrs
    .map(([name, attrMeta]) => `${name}="${attrMeta.example}"`)
    .join(' ');
  const openTag = attrStr ? `<${type} ${attrStr}>` : `<${type}>`;
  const markup = meta.allowsTextContent
    ? `${openTag}${node.content}</${type}>`
    : meta.maxChildren === 0
      ? `<${type}${attrStr ? ` ${attrStr}` : ''} />`
      : `${openTag}</${type}>`;

  return { node, markup };
}

/**
 * Builds the CompilesToSpec for a component.
 * The annotatedExample input/output is left as a placeholder — Phase 6
 * will fill in real compiled output without introducing a compiler dependency.
 *
 * @param type - The component type.
 * @returns A CompilesToSpec derived from metadata.
 */
function buildCompilesToSpec(type: string): CompilesToSpec {
  const meta = getIntrospectableMetadata(type);
  if (!meta) throw new Error(`No metadata for component: ${type}`);

  const example = buildExample(type);

  return {
    outputElements: meta.compilerOutputElements,
    reason: meta.compilerOutputReason,
    annotatedExample: {
      input: example.markup,
      // Phase 6 will populate this with real compiled output.
      output: meta.compilerOutputElements.length > 0
        ? `<!-- compiled to: ${meta.compilerOutputElements.join(', ')} -->`
        : '<!-- no HTML output (directive/logic component) -->',
    },
  };
}

// ---------------------------------------------------------------------------
// Registry cache
// ---------------------------------------------------------------------------

/**
 * Lazily populated cache — built once on first access, invalidated when the
 * runtime registry changes (e.g. a plugin registers a new component).
 */
let _cache: Map<string, ComponentSpec> | null = null;

/**
 * Builds and caches the full registry map on first access.
 *
 * Built-ins are static, so the cache never needs invalidation in
 * production. `_resetRegistryCache()` remains for tests that want a
 * fresh build.
 *
 * Synthetic compiler-only types (prefixed with `_`) are filtered out.
 */
function getRegistry(): Map<string, ComponentSpec> {
  if (_cache !== null) return _cache;

  _cache = new Map<string, ComponentSpec>();

  for (const [type, meta] of Object.entries(getAllMetadata())) {
    if (isSyntheticType(type)) continue;

    const requiredAttributes: AttributeSpec[] = [];
    const optionalAttributes: AttributeSpec[] = [];

    for (const [name, attrMeta] of Object.entries(meta.attributes)) {
      const spec = toAttributeSpec(name, attrMeta);
      if (attrMeta.required) {
        requiredAttributes.push(spec);
      } else {
        optionalAttributes.push(spec);
      }
    }

    const cssPropertyAttributes: AttributeSpec[] = [...requiredAttributes, ...optionalAttributes]
      .filter(a => a.isCssPropAttr === true);

    const componentSpec: ComponentSpec = {
      type,
      description: meta.description,
      category: meta.category,
      allowedParents: buildAllowedParents(type),
      allowedChildren: buildAllowedChildren(type),
      allowsTextContent: meta.allowsTextContent,
      acceptsClassAttribute: 'class' in meta.attributes,
      validClassCategories: meta.validClassCategories,
      requiredAttributes,
      optionalAttributes,
      cssPropertyAttributes,
      compilesTo: buildCompilesToSpec(type),
      example: buildExample(type),
      commonMistakes: meta.commonMistakes,
    };

    _cache.set(type, componentSpec);
  }

  return _cache;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the ComponentSpec for a single component type.
 * Returns `undefined` for unknown types.
 *
 * @param type - Component tag name, e.g. `"mc-button"`.
 * @returns The ComponentSpec, or `undefined` if the type is not registered.
 *
 * @example
 * const spec = getComponentSpec('mc-button');
 * spec?.requiredAttributes.map(a => a.name); // ['href']
 */
export function getComponentSpec(type: string): ComponentSpec | undefined {
  return getRegistry().get(type);
}

/**
 * Returns specs for all known components.
 * The order matches `Object.keys(COMPONENT_METADATA)`.
 *
 * @returns Array of all ComponentSpec objects.
 *
 * @example
 * getAllComponentSpecs().map(s => s.type);
 * // ['mc', 'mc-body', 'mc-section', ...]
 */
export function getAllComponentSpecs(): ComponentSpec[] {
  return Array.from(getRegistry().values());
}

/**
 * Clears the internal registry cache.
 * Intended for tests only — production code should never call this.
 *
 * @internal
 */
export function _resetRegistryCache(): void {
  _cache = null;
}
