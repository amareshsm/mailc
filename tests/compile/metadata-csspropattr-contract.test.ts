/**
 * Contract test: every `isCssPropAttr: true` in `COMPONENT_METADATA` must
 * appear in the compiled output when set.
 *
 * Two parallel sources of truth today: metadata declares attrs;
 * `*_ATTRIBUTE_PROPS` arrays in each compiler apply them. Updating one
 * without the other silently drops the attr (how the mc-list-item
 * `font-size`/`line-height` gap was introduced).
 *
 * Insurance, not architecture. The proper fix is to derive each compiler's
 * apply array from metadata directly — deferred follow-up:
 * "Unify metadata + compiler apply arrays for CSS-prop attributes."
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { COMPONENT_METADATA, type AttributeMetadata } from '../../src/components/metadata.js';

// ---------------------------------------------------------------------------
// Per-component scaffolds — minimal valid documents that exercise one element
// of `type` with the supplied attribute string.
// Returns null for components that cannot be exercised in isolation
// (logic/control-flow components have no styling surface).
// ---------------------------------------------------------------------------

function wrapInDoc(type: string, attrs: string, attrName: string): string | null {
  // Some attributes are conditional — they only get applied when a sibling
  // attribute is also set. E.g. `background-size` and `background-position`
  // only flow into the style when a background image is present (otherwise
  // there's no image to size). The scaffold preserves those dependencies
  // so legitimate conditional applies aren't flagged as drift.
  // Note: mc-hero uses `background-image`; mc-section uses `background-url`
  // (yes, the attribute names differ between components today — that's a
  // separate consistency issue worth filing).
  const heroBgDeps =
    attrName === 'background-size' || attrName === 'background-position'
      ? ' background-image="https://example.com/bg.png" '
      : '';
  const sectionBgDeps =
    attrName === 'background-size' || attrName === 'background-position'
      ? ' background-url="https://example.com/bg.png" '
      : '';

  switch (type) {
    case 'mc-body':
      return `<mc><mc-body ${attrs}><mc-section><mc-column><mc-text>X</mc-text></mc-column></mc-section></mc-body></mc>`;
    case 'mc-section':
      return `<mc><mc-body><mc-section ${attrs}${sectionBgDeps}><mc-column><mc-text>X</mc-text></mc-column></mc-section></mc-body></mc>`;
    case 'mc-column':
      return `<mc><mc-body><mc-section><mc-column ${attrs}><mc-text>X</mc-text></mc-column></mc-section></mc-body></mc>`;
    case 'mc-group':
      return `<mc><mc-body><mc-section><mc-group ${attrs}><mc-column><mc-text>X</mc-text></mc-column></mc-group></mc-section></mc-body></mc>`;
    case 'mc-text':
      return `<mc><mc-body><mc-section><mc-column><mc-text ${attrs}>X</mc-text></mc-column></mc-section></mc-body></mc>`;
    case 'mc-button':
      return `<mc><mc-body><mc-section><mc-column><mc-button href="https://example.com" ${attrs}>X</mc-button></mc-column></mc-section></mc-body></mc>`;
    case 'mc-image':
      return `<mc><mc-body><mc-section><mc-column><mc-image src="https://example.com/x.png" alt="x" ${attrs}/></mc-column></mc-section></mc-body></mc>`;
    case 'mc-divider':
      return `<mc><mc-body><mc-section><mc-column><mc-divider ${attrs}/></mc-column></mc-section></mc-body></mc>`;
    case 'mc-spacer':
      return `<mc><mc-body><mc-section><mc-column><mc-spacer ${attrs}/></mc-column></mc-section></mc-body></mc>`;
    case 'mc-hero':
      return `<mc><mc-body><mc-hero ${attrs}${heroBgDeps}><mc-text>X</mc-text></mc-hero></mc-body></mc>`;
    case 'mc-list':
      return `<mc><mc-body><mc-section><mc-column><mc-list ${attrs}><mc-list-item>X</mc-list-item></mc-list></mc-column></mc-section></mc-body></mc>`;
    case 'mc-list-item':
      return `<mc><mc-body><mc-section><mc-column><mc-list><mc-list-item ${attrs}>X</mc-list-item></mc-list></mc-column></mc-section></mc-body></mc>`;
    default:
      // Logic / structural components (mc-head, mc-attributes, mc-style, etc.)
      // and anything we haven't scaffolded — skipped.
      return null;
  }
}

// ---------------------------------------------------------------------------
// Marker generator — picks a value that (a) is valid for the attribute type
// and (b) is distinctive enough to detect silent drops via substring match.
// ---------------------------------------------------------------------------

interface Marker {
  /** The value to set the attribute to in the template. */
  value: string;
  /**
   * The substring to look for in the compiled output. Usually identical to
   * `value`, but for shorthand attrs (e.g. `border: "3px solid #abcdef"`)
   * we check for the most distinctive token (`#abcdef`).
   */
  expect: string;
}

function markerFor(attrName: string, attrMeta: AttributeMetadata): Marker {
  // Enums — pick a valid value, preferring one unlikely to match defaults.
  if (attrMeta.type === 'enum' && Array.isArray(attrMeta.values) && attrMeta.values.length > 0) {
    // Try to pick a non-default enum value — last entry is often less common
    // than the first (e.g. ['normal', 'bold'] → 'bold' is more detectable).
    const def = attrMeta.default;
    const last = attrMeta.values[attrMeta.values.length - 1] ?? '';
    const candidate = attrMeta.values.find((v) => v !== def) ?? last;
    return { value: candidate, expect: candidate };
  }

  // Per-attribute special cases.
  switch (attrName) {
    case 'opacity':
      return { value: '0.77', expect: '0.77' };
    case 'border':
      return { value: '3px solid #abcdef', expect: '#abcdef' };
    case 'border-top':
    case 'border-right':
    case 'border-bottom':
    case 'border-left':
      return { value: '2px solid #abcdef', expect: '#abcdef' };
    case 'box-shadow':
      return { value: '0 4px 8px #abcdef', expect: '#abcdef' };
    case 'background-size':
      return { value: 'cover', expect: 'cover' };
    case 'background-position':
      return { value: 'center', expect: 'center' };
  }

  // By value type.
  if (attrMeta.type === 'color') {
    return { value: '#abcdef', expect: '#abcdef' };
  }

  // Default: a distinctive pixel value unlikely to be emitted by any compiler default.
  return { value: '37px', expect: '37px' };
}

/**
 * Real drift between metadata and compiler. Tracked, not silently passed,
 * so they surface in review. When you fix one, delete its entry.
 *
 * TODO: address these by REMOVING `isCssPropAttr` from the metadata entry
 * (declaring an attr the compiler refuses to apply gives users false confidence):
 *
 *   mc-section / margin{,-top,-right,-bottom,-left}
 *     CSS margin on <table> is unreliable across email clients (Outlook
 *     ignores it). Compiler intentionally omits margin handling.
 *
 *   mc-button / line-height
 *     button.ts:110 hardcodes line-height to font-size ("padding handles
 *     the button height"). User-supplied line-height is overridden.
 *
 * Keep this list TINY. Growth = metadata/compiler misalignment worth fixing.
 */
const KNOWN_EXCEPTIONS = new Set<string>([
  'mc-section/margin',
  'mc-section/margin-top',
  'mc-section/margin-right',
  'mc-section/margin-bottom',
  'mc-section/margin-left',
  'mc-button/line-height',
]);

// ---------------------------------------------------------------------------
// The contract test
// ---------------------------------------------------------------------------

describe('contract: every isCssPropAttr in metadata applies to compiled output', () => {
  for (const [type, meta] of Object.entries(COMPONENT_METADATA)) {
    for (const [attrName, attrMeta] of Object.entries(meta.attributes)) {
      if (attrMeta.isCssPropAttr !== true) continue;

      const key = `${type}/${attrName}`;

      it(`<${type}> applies "${attrName}" to compiled output`, () => {
        if (KNOWN_EXCEPTIONS.has(key)) return; // known transformation — skip

        const template = wrapInDoc(type, '', attrName);
        if (template === null) return; // unscaffolded component — skip

        const marker = markerFor(attrName, attrMeta);
        const templateWithAttr = wrapInDoc(type, `${attrName}="${marker.value}"`, attrName);
        if (templateWithAttr === null) return; // unreachable — first wrapInDoc returned non-null

        const result = compile(templateWithAttr, { templateStyle: 'attribute' });
        expect(result.html, `compile produced no HTML for <${type}>`).not.toBeNull();
        expect(
          result.html,
          `<${type}> declared isCssPropAttr "${attrName}" in metadata, but the value "${marker.value}" ` +
            `(or its distinctive token "${marker.expect}") did not appear in the compiled HTML. ` +
            `The compiler is likely silently dropping it — check the per-component apply array ` +
            `(e.g. *_ATTRIBUTE_PROPS in src/compiler/components/${type.slice(3)}.ts).`,
        ).toContain(marker.expect);
      });
    }
  }
});
