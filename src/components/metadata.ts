/**
 * Single source of truth for all mc-* component structural knowledge.
 *
 * Every fact about a component lives here once:
 *   - Nesting (parent, alternateParents, maxChildren, mustFollow)
 *   - Attribute definitions (type, required, description, default values)
 *   - Compiler output elements (used by introspection compilesTo)
 *   - Human descriptions and common mistakes (docs / AI context)
 *
 * Downstream consumers derive from this file — they never duplicate it:
 *   - COMPONENT_RULES in src/validator/rules.ts  → deriveComponentRule()
 *   - DEFAULTS in each compiler component file   → deriveDefaults()
 *   - Introspection API (Phase 1+)               → reads COMPONENT_METADATA directly
 *
 * @see docs/decisions/005-mustfollow-in-component-metadata.md
 * @module components/metadata
 */

import type { ComponentRule } from '../types.js';
import type { AttributeValueType, ComponentCategory, CSSCategory } from '../types.js';

// ---------------------------------------------------------------------------
// AttributeMetadata
// ---------------------------------------------------------------------------

/**
 * Full description of a single attribute on a component.
 * The `default` field is the canonical default value used by the compiler.
 */
export interface AttributeMetadata {
  type: AttributeValueType;
  required: boolean;
  description: string;
  example: string;
  /** Allowed values for type: 'enum'. */
  values?: string[];
  /** Default value used by the compiler (mirrors the old per-file DEFAULTS). */
  default?: string;
  /** True when caniemail compatibility notes exist for this attribute. */
  hasEmailCompatibilityNotes: boolean;
  /**
   * True when this attribute represents a CSS property that can be expressed
   * via a Tailwind-style class and is restricted in class mode.
   *
   * Structural attributes (`href`, `src`, `width` on mc-column, `height` on
   * mc-hero, etc.) are intentionally left unset — they serve layout or content
   * purposes that cannot be replaced by a Tailwind class.
   *
   * Used by:
   *   - `src/compiler/styling-mode.ts` to derive `CSS_PROP_ATTRS_BY_COMPONENT`
   *   - `src/introspect/registry.ts` to populate `ComponentSpec.cssPropertyAttributes`
   */
  isCssPropAttr?: boolean;
  /**
   * The suggested Tailwind-style class replacement for this attribute in class mode.
   * e.g. `'text-[#value]'` for `color`, `'p-[#value]'` for `padding`.
   *
   * Undefined when there is no direct Tailwind equivalent (the hint text will
   * still contain a note like "(use style=... for complex shorthands)").
   *
   * Used in error messages and IDE code action fix instructions.
   */
  classHint?: string;
}

// ---------------------------------------------------------------------------
// ComponentMetadata
// ---------------------------------------------------------------------------

/**
 * Full structural and documentary description of a single mc-* component.
 */
export interface ComponentMetadata {
  /** One-line human description — used in docs and AI context. */
  description: string;
  /** Broad category for introspection filtering. */
  category: ComponentCategory;
  /** Required parent type. null = can appear at any nesting level. */
  parent: string | null;
  /** Additional valid parent types beyond parent. */
  alternateParents?: string[];
  /** Maximum number of element children (Infinity = unlimited). */
  maxChildren: number;
  /** Whether this component accepts raw text/HTML content between its tags. */
  allowsTextContent: boolean;
  /**
   * CSS properties applied to the outer wrapper element rather than the
   * component itself (mc-button only — margin/max-width go on the wrapper div).
   */
  wrapperProps?: string[];
  /**
   * If set, this tag must directly follow one of these sibling types.
   * Enforces mc-else-if / mc-else ordering constraints.
   * @see docs/decisions/005-mustfollow-in-component-metadata.md
   */
  mustFollow?: string[];
  /** HTML elements this component compiles to. Used by compilesTo() introspection. */
  compilerOutputElements: string[];
  /** One sentence explaining why these specific HTML elements are used. */
  compilerOutputReason: string;
  /**
   * CSS property categories this component meaningfully accepts via its `class` attribute.
   * Used by `validClasses()` to filter the global class pool down to relevant suggestions.
   *
   * Empty array = component accepts no `class` attribute or has no meaningful categories.
   * Agents should use this to avoid suggesting `font-*` classes to `mc-spacer`, etc.
   */
  validClassCategories: CSSCategory[];
  /** Common usage mistakes — for AI context and docs. */
  commonMistakes: string[];
  /** All known attributes. Key = attribute name. */
  attributes: Record<string, AttributeMetadata>;
}

// ---------------------------------------------------------------------------
// COMPONENT_METADATA — the canonical record (every mc-* component)
// ---------------------------------------------------------------------------

/**
 * Canonical metadata for every mc-* component.
 *
 * To change a component: edit here only.
 * validator/rules.ts, compiler DEFAULTS, and the Introspection API all
 * update automatically via the derive* helpers below.
 */
export const COMPONENT_METADATA: Record<string, ComponentMetadata> = {

  // ── Document structure ──────────────────────────────────────────────────

  'mc': {
    description: 'Document root. Every mailc template must have exactly one <mc> element.',
    category: 'container',
    parent: null,
    maxChildren: Infinity,
    allowsTextContent: false,
    compilerOutputElements: [],
    compilerOutputReason: 'Transparent wrapper — delegates to mc-head + mc-body compilers. Produces no HTML output of its own.',
    validClassCategories: [],
    commonMistakes: [
      'Using <mc-body> as root without wrapping in <mc>',
      'Having more than one <mc> per document',
    ],
    attributes: {},
  },

  'mc-body': {
    description: 'Email body container. Must be a direct child of <mc>.',
    category: 'container',
    parent: 'mc',
    maxChildren: Infinity,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Top-level 100%-width table for full-width email wrapper.',
    validClassCategories: ['background', 'spacing'],
    commonMistakes: [
      'Placing mc-section directly without mc-body as root',
      'Having more than one mc-body per document',
    ],
    attributes: {
      'class':            { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: 'bg-gray-50', hasEmailCompatibilityNotes: true },
      'id':               { type: 'string',           required: false, description: 'Unique identifier.', example: 'email-body', hasEmailCompatibilityNotes: false },
      'background-color': { type: 'color',            required: false, description: 'Background color of the entire email canvas.', example: '#f5f5f5', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-[#value]' },
      'width':            { type: 'css-value',        required: false, description: 'Max width of the email content area.', example: '600px', default: '600px', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-head': {
    description: 'Head section. Contains meta, styles, and global attribute defaults.',
    category: 'head',
    parent: 'mc',
    maxChildren: Infinity,
    allowsTextContent: false,
    compilerOutputElements: ['head', 'style', 'meta'],
    compilerOutputReason: 'Generates the <head> block with meta charset, viewport, and collected styles.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'class': { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: '', hasEmailCompatibilityNotes: false },
      'id':    { type: 'string',           required: false, description: 'Unique identifier.', example: 'head', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-attributes': {
    description: 'Defines default attribute values for component types within scope.',
    category: 'head',
    parent: 'mc-head',
    maxChildren: Infinity,
    allowsTextContent: false,
    compilerOutputElements: [],
    compilerOutputReason: 'Compile-time directive only — no HTML output.',
    validClassCategories: [],
    commonMistakes: ['Using mc-attributes outside mc-head'],
    attributes: {
      'class': { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: '', hasEmailCompatibilityNotes: false },
      'id':    { type: 'string',           required: false, description: 'Unique identifier.', example: 'attrs', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-all': {
    description: 'Sets global default attributes for all components (inside mc-attributes).',
    category: 'head',
    parent: 'mc-attributes',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: [],
    compilerOutputReason: 'Compile-time directive — no HTML output.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'font-family':    { type: 'string',    required: false, description: 'Global default font family.', example: 'Arial, sans-serif', hasEmailCompatibilityNotes: true },
      'font-size':      { type: 'css-value', required: false, description: 'Global default font size.', example: '16px', hasEmailCompatibilityNotes: false },
      'font-weight':    { type: 'enum',      required: false, description: 'Global default font weight.', example: 'normal', values: ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'], hasEmailCompatibilityNotes: false },
      'color':          { type: 'color',     required: false, description: 'Global default text color.', example: '#333333', hasEmailCompatibilityNotes: true },
      'line-height':    { type: 'css-value', required: false, description: 'Global default line height.', example: '1.6', hasEmailCompatibilityNotes: false },
      'letter-spacing': { type: 'css-value', required: false, description: 'Global default letter spacing.', example: '0', hasEmailCompatibilityNotes: false },
      'padding':        { type: 'css-value', required: false, description: 'Global default padding.', example: '0', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-class': {
    description: 'Defines a named attribute bundle applied to components via mc-class="name".',
    category: 'head',
    parent: 'mc-attributes',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: [],
    compilerOutputReason: 'Compile-time directive — no HTML output.',
    validClassCategories: [],
    commonMistakes: [
      'Omitting the required name attribute',
      'Referencing a class name not defined in mc-attributes',
      'Circular extends (a extends b, b extends a)',
    ],
    attributes: {
      'name':           { type: 'string',          required: true,  description: 'Unique class name referenced with mc-class="..." on components.', example: 'hero-heading', hasEmailCompatibilityNotes: false },
      'extends':        { type: 'string',          required: false, description: 'Another mc-class name to inherit attributes from. Child attributes override inherited ones.', example: 'base-button', hasEmailCompatibilityNotes: false },
      'class':          { type: 'tailwind-classes', required: false, description: 'Tailwind utility classes to apply to components using this bundle.', example: 'text-[16px] font-bold', hasEmailCompatibilityNotes: false },
      'font-family':    { type: 'string',          required: false, description: 'Font family for components using this class.', example: 'Arial, sans-serif', hasEmailCompatibilityNotes: true },
      'font-size':      { type: 'css-value',       required: false, description: 'Font size for components using this class.', example: '16px', hasEmailCompatibilityNotes: false },
      'font-weight':    { type: 'enum',            required: false, description: 'Font weight for components using this class.', example: 'bold', values: ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'], hasEmailCompatibilityNotes: false },
      'font-style':     { type: 'enum',            required: false, description: 'Font style for components using this class.', example: 'italic', values: ['normal', 'italic', 'oblique'], hasEmailCompatibilityNotes: false },
      'color':          { type: 'color',           required: false, description: 'Text color for components using this class.', example: '#333333', hasEmailCompatibilityNotes: true },
      'line-height':    { type: 'css-value',       required: false, description: 'Line height for components using this class.', example: '1.6', hasEmailCompatibilityNotes: false },
      'letter-spacing': { type: 'css-value',       required: false, description: 'Letter spacing for components using this class.', example: '0.5px', hasEmailCompatibilityNotes: false },
      'text-align':     { type: 'enum',            required: false, description: 'Text alignment for components using this class.', example: 'center', values: ['left', 'center', 'right', 'justify'], hasEmailCompatibilityNotes: false },
      'text-decoration':{ type: 'string',          required: false, description: 'Text decoration for components using this class.', example: 'underline', hasEmailCompatibilityNotes: false },
      'padding':        { type: 'css-value',       required: false, description: 'Padding for components using this class.', example: '16px', hasEmailCompatibilityNotes: false },
      'padding-top':    { type: 'css-value',       required: false, description: 'Top padding for components using this class.', example: '8px', hasEmailCompatibilityNotes: false },
      'padding-right':  { type: 'css-value',       required: false, description: 'Right padding for components using this class.', example: '16px', hasEmailCompatibilityNotes: false },
      'padding-bottom': { type: 'css-value',       required: false, description: 'Bottom padding for components using this class.', example: '8px', hasEmailCompatibilityNotes: false },
      'padding-left':   { type: 'css-value',       required: false, description: 'Left padding for components using this class.', example: '16px', hasEmailCompatibilityNotes: false },
      'background-color': { type: 'color',         required: false, description: 'Background color for components using this class.', example: '#ffffff', hasEmailCompatibilityNotes: true },
      'border-radius':  { type: 'css-value',       required: false, description: 'Border radius for components using this class.', example: '4px', hasEmailCompatibilityNotes: false },
      'border-color':   { type: 'color',           required: false, description: 'Border color for components using this class.', example: '#cccccc', hasEmailCompatibilityNotes: true },
      'border-width':   { type: 'css-value',       required: false, description: 'Border width for components using this class.', example: '1px', hasEmailCompatibilityNotes: false },
      'border-style':   { type: 'enum',            required: false, description: 'Border style for components using this class.', example: 'solid', values: ['solid', 'dashed', 'dotted', 'double', 'none'], hasEmailCompatibilityNotes: false },
      'width':          { type: 'css-value',       required: false, description: 'Width for components using this class.', example: '100%', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-style': {
    description: 'Injects raw CSS into the email <head>. This is the explicit escape hatch for CSS that mailc\'s structured API does not cover (media queries, pseudo-classes, custom selectors, dark-mode rules). Content passes through without classification.',
    category: 'head',
    parent: 'mc-head',
    maxChildren: 0,
    allowsTextContent: true,
    compilerOutputElements: ['style'],
    compilerOutputReason: 'Content placed verbatim inside a <style> block in the generated <head>. Not gated by compatibilityMode — even in strict mode, mc-style content is NOT inspected, classified, or stripped. If you write box-shadow / opacity / border-radius (or any ENHANCE property) inside mc-style, it ships untouched. This is by design: mc-style exists so power users can write CSS that the structured attribute / class API does not expose. If you need full strict enforcement for CI, lint mc-style content separately.',
    validClassCategories: [],
    commonMistakes: ['Using desktop layout CSS that email clients will ignore'],
    attributes: {
      'class':  { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: '', hasEmailCompatibilityNotes: false },
      'id':     { type: 'string',           required: false, description: 'Unique identifier.', example: 'custom-styles', hasEmailCompatibilityNotes: false },
      'inline': { type: 'boolean',          required: false, description: 'If true, styles are inlined into elements.', example: 'true', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-preview': {
    description: 'Preheader text — shown in inbox preview. Hidden in rendered email.',
    category: 'head',
    parent: 'mc-head',
    maxChildren: 0,
    allowsTextContent: true,
    compilerOutputElements: ['div'],
    compilerOutputReason: 'Hidden div with overflow:hidden and font-size:0 to suppress visual rendering.',
    validClassCategories: [],
    commonMistakes: [
      'Making preheader text too long — most clients truncate after 90 characters',
      'Omitting mc-preview entirely — inbox preview shows raw HTML instead',
    ],
    attributes: {
      'class': { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: '', hasEmailCompatibilityNotes: false },
      'id':    { type: 'string',           required: false, description: 'Unique identifier.', example: 'preview', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-title': {
    description: 'Sets the <title> tag of the generated email HTML.',
    category: 'head',
    parent: 'mc-head',
    maxChildren: 0,
    allowsTextContent: true,
    compilerOutputElements: ['title'],
    compilerOutputReason: 'Content placed verbatim in <title>.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'class': { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: '', hasEmailCompatibilityNotes: false },
      'id':    { type: 'string',           required: false, description: 'Unique identifier.', example: 'email-title', hasEmailCompatibilityNotes: false },
    },
  },

  // ── Layout ──────────────────────────────────────────────────────────────

  'mc-section': {
    description: 'A full-width horizontal row. Holds one or more mc-column or mc-group children.',
    category: 'container',
    parent: 'mc-body',
    // No upper bound on children. Dense layouts (5+ slot rows) are a soft
    // style concern, not a technical break — left to design judgement and
    // optional linters rather than enforced as a compile error.
    maxChildren: Infinity,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Full-width outer table plus Outlook conditional inner table for column layout.',
    validClassCategories: ['background', 'spacing', 'border', 'sizing', 'effects'],
    commonMistakes: [
      'Placing content directly in mc-section — must use mc-column or mc-group',
    ],
    attributes: {
      'class':            { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: 'bg-white', hasEmailCompatibilityNotes: true },
      'id':               { type: 'string',           required: false, description: 'Unique identifier.', example: 'hero-section', hasEmailCompatibilityNotes: false },
      'background-color': { type: 'color',            required: false, description: 'Section background color.', example: '#ffffff', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-[#value]' },
      'background-url':   { type: 'url',              required: false, description: 'Background image URL.', example: 'https://example.com/bg.jpg', hasEmailCompatibilityNotes: true },
      'padding':          { type: 'css-value',        required: false, description: 'Padding shorthand around the section content.', example: '20px 0', default: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'p-[#value]' },
      'padding-top':      { type: 'css-value',        required: false, description: 'Top padding.', example: '20px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pt-[#value]' },
      'padding-right':    { type: 'css-value',        required: false, description: 'Right padding.', example: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pr-[#value]' },
      'padding-bottom':   { type: 'css-value',        required: false, description: 'Bottom padding.', example: '20px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pb-[#value]' },
      'padding-left':     { type: 'css-value',        required: false, description: 'Left padding.', example: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pl-[#value]' },
      'full-width':       { type: 'boolean',          required: false, description: 'Extends background to the full viewport width.', example: 'true', hasEmailCompatibilityNotes: false },
      'direction':        { type: 'enum',             required: false, description: 'Column layout direction.', example: 'ltr', values: ['ltr', 'rtl'], default: 'ltr', hasEmailCompatibilityNotes: false },
      'border':              { type: 'css-value',        required: false, description: 'CSS border shorthand.', example: '1px solid #e5e7eb', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use style="border: 1px solid #ccc")' },
      'border-top':          { type: 'css-value',        required: false, description: 'Top border.', example: '2px solid #e5e7eb', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use style="border-top: 1px solid #ccc")' },
      'border-right':        { type: 'css-value',        required: false, description: 'Right border.', example: '1px solid #e5e7eb', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use style="border-right: 1px solid #ccc")' },
      'border-bottom':       { type: 'css-value',        required: false, description: 'Bottom border.', example: '2px solid #e5e7eb', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use style="border-bottom: 1px solid #ccc")' },
      'border-left':         { type: 'css-value',        required: false, description: 'Left border.', example: '1px solid #e5e7eb', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use style="border-left: 1px solid #ccc")' },
      'border-radius':       { type: 'css-value',        required: false, description: 'Rounded corners (ENHANCE).', example: '8px', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'rounded-[#value]' },
      'box-shadow':          { type: 'css-value',        required: false, description: 'Drop shadow on the section (ENHANCE — Outlook ignores). Supports single shadow, multi-comma stacked shadows, rgba(), and inset.', example: '0 4px 12px rgba(0,0,0,0.1)', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'shadow-[#value]' },
      'opacity':             { type: 'css-value',        required: false, description: 'Section opacity 0–1 (ENHANCE — Outlook ignores).', example: '0.95', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'opacity-#value' },
      'background-position': { type: 'enum',             required: false, description: 'Background image position (CSS only).', example: 'center', values: ['top', 'center', 'bottom', 'left', 'right'], hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-#value' },
      'background-size':     { type: 'enum',             required: false, description: 'Background image size (CSS only).', example: 'cover', values: ['cover', 'contain', 'auto'], hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-#value' },
      'text-align':          { type: 'enum',             required: false, description: 'Text alignment for inline content.', example: 'center', values: ['left', 'center', 'right', 'justify'], default: 'center', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'text-#value' },
      'margin':              { type: 'css-value',        required: false, description: 'Margin shorthand around the section.', example: '0 auto', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'm-[#value]' },
      'margin-top':          { type: 'css-value',        required: false, description: 'Top margin.', example: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'mt-[#value]' },
      'margin-right':        { type: 'css-value',        required: false, description: 'Right margin.', example: 'auto', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'mr-[#value]' },
      'margin-bottom':       { type: 'css-value',        required: false, description: 'Bottom margin.', example: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'mb-[#value]' },
      'margin-left':         { type: 'css-value',        required: false, description: 'Left margin.', example: 'auto', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'ml-[#value]' },
    },
  },

  'mc-group': {
    description: 'Wraps mc-column children to keep them side-by-side on mobile (no auto-stacking).',
    category: 'container',
    parent: 'mc-section',
    // No upper bound — mc-group exists for tight rows of small things
    // (social icons, star ratings, footer link rows) which routinely have
    // 5–8 children. The mc-section 4-slot cap still constrains how many
    // groups can sit side-by-side in a single row.
    maxChildren: Infinity,
    allowsTextContent: false,
    compilerOutputElements: ['div', 'table', 'tr', 'td'],
    compilerOutputReason: 'Outer inline-block div forces children to stay horizontal on mobile; Outlook conditional table reproduces the row layout for MSO clients.',
    validClassCategories: ['background', 'spacing'],
    commonMistakes: [
      'Placing mc-group directly in mc-body — must be inside mc-section',
      'Putting non-mc-column content directly inside mc-group',
      'Using px widths on child mc-columns — children must use percentage widths',
    ],
    attributes: {
      'class':            { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: 'bg-white', hasEmailCompatibilityNotes: true },
      'id':               { type: 'string',           required: false, description: 'Unique identifier.', example: 'social-row', hasEmailCompatibilityNotes: false },
      'width':            { type: 'css-value',        required: false, description: 'Group width inside the section. Defaults to (100 / sibling count) %.', example: '100%', hasEmailCompatibilityNotes: false },
      'background-color': { type: 'color',            required: false, description: 'Group background color.', example: '#ffffff', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-[#value]' },
      'direction':        { type: 'enum',             required: false, description: 'Child render order.', example: 'ltr', values: ['ltr', 'rtl'], default: 'ltr', hasEmailCompatibilityNotes: false },
      'vertical-align':   { type: 'enum',             required: false, description: 'Vertical alignment of grouped columns.', example: 'top', values: ['top', 'middle', 'bottom'], default: 'top', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'align-#value' },
    },
  },

  'mc-column': {
    description: 'A column inside mc-section. Stacks vertically on mobile (or stays side-by-side when wrapped in mc-group).',
    category: 'container',
    parent: 'mc-section',
    alternateParents: ['mc-group'],
    maxChildren: Infinity,
    allowsTextContent: false,
    compilerOutputElements: ['td', 'div'],
    compilerOutputReason: 'td for Outlook fixed-width layout, div with display:inline-block for modern clients.',
    validClassCategories: ['background', 'spacing', 'border', 'sizing', 'effects'],
    commonMistakes: [
      'Placing mc-column directly in mc-body — must be inside mc-section',
    ],
    attributes: {
      'class':                    { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: 'w-1/2', hasEmailCompatibilityNotes: true },
      'id':                       { type: 'string',           required: false, description: 'Unique identifier.', example: 'main-col', hasEmailCompatibilityNotes: false },
      'width':                    { type: 'css-value',        required: false, description: 'Column width.', example: '300px', hasEmailCompatibilityNotes: false },
      'vertical-align':           { type: 'enum',             required: false, description: 'Vertical alignment of column content.', example: 'top', values: ['top', 'middle', 'bottom'], default: 'top', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'align-#value' },
      'background-color':         { type: 'color',            required: false, description: 'Column background color.', example: '#ffffff', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-[#value]' },
      'padding':                  { type: 'css-value',        required: false, description: 'Inner padding shorthand.', example: '16px', default: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'p-[#value]' },
      'padding-top':              { type: 'css-value',        required: false, description: 'Top padding.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pt-[#value]' },
      'padding-right':            { type: 'css-value',        required: false, description: 'Right padding.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pr-[#value]' },
      'padding-bottom':           { type: 'css-value',        required: false, description: 'Bottom padding.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pb-[#value]' },
      'padding-left':             { type: 'css-value',        required: false, description: 'Left padding.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pl-[#value]' },
      'border':                   { type: 'css-value',        required: false, description: 'CSS border shorthand.', example: '1px solid #e5e7eb', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use style="border: 1px solid #ccc")' },
      'border-top':               { type: 'css-value',        required: false, description: 'Top border.', example: '2px solid #e5e7eb', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use style="border-top: 1px solid #ccc")' },
      'border-right':             { type: 'css-value',        required: false, description: 'Right border.', example: '1px solid #e5e7eb', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use style="border-right: 1px solid #ccc")' },
      'border-bottom':            { type: 'css-value',        required: false, description: 'Bottom border.', example: '2px solid #e5e7eb', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use style="border-bottom: 1px solid #ccc")' },
      'border-left':              { type: 'css-value',        required: false, description: 'Left border.', example: '4px solid #3b82f6', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use style="border-left: 1px solid #ccc")' },
      'border-radius':            { type: 'css-value',        required: false, description: 'Rounded corners (ENHANCE).', example: '8px', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'rounded-[#value]' },
      'box-shadow':               { type: 'css-value',        required: false, description: 'Drop shadow on the column (ENHANCE — Outlook ignores). Supports single shadow, multi-comma stacked shadows, rgba(), and inset.', example: '0 2px 8px rgba(0,0,0,0.08)', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'shadow-[#value]' },
      'opacity':                  { type: 'css-value',        required: false, description: 'Column opacity 0–1 (ENHANCE — Outlook ignores).', example: '0.9', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'opacity-#value' },
      'inner-background-color':   { type: 'color',            required: false, description: 'Background color of the inner content area.', example: '#f9f9f9', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-[#value] (applied to inner td)' },
    },
  },

  // ── Content ─────────────────────────────────────────────────────────────

  'mc-text': {
    description: 'Rich text content block. Accepts HTML inside.',
    category: 'content',
    parent: 'mc-column',
    alternateParents: ['mc-hero'],
    maxChildren: 0,
    allowsTextContent: true,
    compilerOutputElements: ['div', 'p', 'span'],
    compilerOutputReason: 'Div wrapper preserves block layout; p and span for inline text formatting.',
    validClassCategories: ['typography', 'background', 'spacing'],
    commonMistakes: [
      'Using layout classes (flex, grid) inside mc-text',
      'Forgetting that mc-text must be inside mc-column',
    ],
    attributes: {
      'class':            { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: 'text-gray-700 text-base', hasEmailCompatibilityNotes: true },
      'id':               { type: 'string',           required: false, description: 'Unique identifier.', example: 'intro-text', hasEmailCompatibilityNotes: false },
      'color':            { type: 'color',            required: false, description: 'Text color.', example: '#333333', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'text-[#value]' },
      'background-color': { type: 'color',            required: false, description: 'Background color behind the text block.', example: '#f5f5f5', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-[#value]' },
      'width':            { type: 'css-value',        required: false, description: 'Width of the text block.', example: '100%', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'w-[#value]' },
      'font-family':      { type: 'string',           required: false, description: 'Font family.', example: 'Georgia, serif', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use mc-attributes for global font-family)' },
      'font-size':        { type: 'css-value',        required: false, description: 'Font size.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'text-[#value]' },
      'font-weight':      { type: 'enum',             required: false, description: 'Font weight.', example: 'normal', values: ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'], hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'font-#value' },
      'font-style':       { type: 'enum',             required: false, description: 'Font style.', example: 'italic', values: ['normal', 'italic', 'oblique'], hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'italic' },
      'line-height':      { type: 'css-value',        required: false, description: 'Line height.', example: '1.6', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'leading-[#value]' },
      'letter-spacing':   { type: 'css-value',        required: false, description: 'Letter spacing.', example: '0.02em', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'tracking-[#value]' },
      'text-decoration':  { type: 'enum',             required: false, description: 'Text decoration.', example: 'none', values: ['none', 'underline', 'line-through'], hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'underline or no-underline' },
      'text-transform':   { type: 'enum',             required: false, description: 'Text transform.', example: 'none', values: ['none', 'uppercase', 'lowercase', 'capitalize'], hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'uppercase or lowercase' },
      'text-align':       { type: 'enum',             required: false, description: 'Text alignment.', example: 'left', values: ['left', 'center', 'right', 'justify'], hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'text-#value' },
      'padding':          { type: 'css-value',        required: false, description: 'Padding shorthand.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'p-[#value]' },
      'padding-top':      { type: 'css-value',        required: false, description: 'Top padding.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pt-[#value]' },
      'padding-right':    { type: 'css-value',        required: false, description: 'Right padding.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pr-[#value]' },
      'padding-bottom':   { type: 'css-value',        required: false, description: 'Bottom padding.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pb-[#value]' },
      'padding-left':     { type: 'css-value',        required: false, description: 'Left padding.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pl-[#value]' },
      'margin-top':       { type: 'css-value',        required: false, description: 'Top margin.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'mt-[#value]' },
      'margin-right':     { type: 'css-value',        required: false, description: 'Right margin.', example: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'mr-[#value]' },
      'margin-bottom':    { type: 'css-value',        required: false, description: 'Bottom margin.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'mb-[#value]' },
      'margin-left':      { type: 'css-value',        required: false, description: 'Left margin.', example: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'ml-[#value]' },
      'align':            { type: 'enum',             required: false, description: 'Block alignment.', example: 'left', values: ['left', 'center', 'right'], hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'text-#value' },
    },
  },

  'mc-image': {
    description: 'Email-safe image. Wrapped in a table for Outlook width constraints.',
    category: 'content',
    parent: 'mc-column',
    alternateParents: ['mc-hero'],
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'td', 'img'],
    compilerOutputReason: 'Table wrapper forces Outlook to respect max-width, which it ignores on <img> directly.',
    validClassCategories: ['sizing', 'spacing', 'border', 'effects'],
    commonMistakes: [
      'Forgetting the required src attribute',
      'Forgetting alt text — breaks accessibility',
      'Using percentage widths — prefer px for Outlook compatibility',
    ],
    attributes: {
      'class':            { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: 'rounded', hasEmailCompatibilityNotes: true },
      'id':               { type: 'string',           required: false, description: 'Unique identifier.', example: 'hero-image', hasEmailCompatibilityNotes: false },
      'src':              { type: 'url',              required: true,  description: 'Image source URL. Must be absolute.', example: 'https://example.com/image.png', hasEmailCompatibilityNotes: false },
      'alt':              { type: 'string',           required: false, description: 'Alt text for screen readers and image-off rendering.', example: 'Product screenshot', default: '', hasEmailCompatibilityNotes: false },
      'width':            { type: 'css-value',        required: false, description: 'Image width in px.', example: '600px', hasEmailCompatibilityNotes: false },
      'height':           { type: 'css-value',        required: false, description: 'Image height.', example: 'auto', default: 'auto', hasEmailCompatibilityNotes: false },
      'href':             { type: 'url',              required: false, description: 'Makes the image a link.', example: 'https://example.com', hasEmailCompatibilityNotes: false },
      'title':            { type: 'string',           required: false, description: 'Tooltip title attribute.', example: 'Click to visit', hasEmailCompatibilityNotes: false },
      'border-radius':    { type: 'css-value',        required: false, description: 'Rounded corners (ENHANCE).', example: '8px', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'rounded-[#value]' },
      'box-shadow':       { type: 'css-value',        required: false, description: 'Drop shadow on the image (ENHANCE — Outlook ignores). Supports single shadow, multi-comma stacked shadows, rgba(), and inset.', example: '0 4px 8px rgba(0,0,0,0.15)', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'shadow-[#value]' },
      'opacity':          { type: 'css-value',        required: false, description: 'Image opacity 0–1 (ENHANCE — Outlook ignores).', example: '0.85', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'opacity-#value' },
      'border':           { type: 'css-value',        required: false, description: 'CSS border shorthand on the image wrapper td.', example: '1px solid #e5e7eb', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use style="border: 1px solid #ccc")' },
      'padding':          { type: 'css-value',        required: false, description: 'Padding around the image.', example: '8px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'p-[#value]' },
      'padding-top':      { type: 'css-value',        required: false, description: 'Top padding.', example: '8px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pt-[#value]' },
      'padding-right':    { type: 'css-value',        required: false, description: 'Right padding.', example: '8px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pr-[#value]' },
      'padding-bottom':   { type: 'css-value',        required: false, description: 'Bottom padding.', example: '8px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pb-[#value]' },
      'padding-left':     { type: 'css-value',        required: false, description: 'Left padding.', example: '8px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pl-[#value]' },
      'align':            { type: 'enum',             required: false, description: 'Horizontal alignment.', example: 'center', values: ['left', 'center', 'right'], hasEmailCompatibilityNotes: false },
      'target':           { type: 'enum',             required: false, description: 'Link target (when href is set).', example: '_blank', values: ['_self', '_blank'], hasEmailCompatibilityNotes: false },
      'rel':              { type: 'string',           required: false, description: 'Link rel (when href is set).', example: 'noopener noreferrer', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-button': {
    description: 'Clickable button with automatic Outlook VML fallback.',
    category: 'content',
    parent: 'mc-column',
    alternateParents: ['mc-hero'],
    maxChildren: 0,
    allowsTextContent: true,
    wrapperProps: ['margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'max-width', 'box-shadow', 'opacity'],
    compilerOutputElements: ['div', 'table', 'td', 'a', 'v:roundrect'],
    compilerOutputReason: 'VML v:roundrect for Outlook rounded buttons, div+a fallback for modern clients.',
    validClassCategories: ['typography', 'background', 'spacing', 'border', 'sizing', 'effects'],
    commonMistakes: [
      'Forgetting the required href attribute',
      'Placing mc-button directly in mc-section — must be inside mc-column',
      'Using flex or grid classes — breaks table-based layout',
    ],
    attributes: {
      'class':            { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: 'bg-brand text-white rounded', hasEmailCompatibilityNotes: true },
      'id':               { type: 'string',           required: false, description: 'Unique identifier.', example: 'cta-button', hasEmailCompatibilityNotes: false },
      'href':             { type: 'url',              required: true,  description: 'Button destination URL.', example: 'https://example.com', hasEmailCompatibilityNotes: false },
      'background-color': { type: 'color',            required: false, description: 'Button background color.', example: '#0066cc', default: '#000000', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-[#value]' },
      'color':            { type: 'color',            required: false, description: 'Button text color.', example: '#ffffff', default: '#ffffff', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'text-[#value]' },
      'font-family':      { type: 'string',           required: false, description: 'Font family.', example: 'Arial, sans-serif', default: 'Arial, sans-serif', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use mc-attributes for global font-family)' },
      'font-size':        { type: 'css-value',        required: false, description: 'Font size.', example: '16px', default: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'text-[#value]' },
      'font-weight':      { type: 'enum',             required: false, description: 'Font weight.', example: 'bold', values: ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'], default: 'bold', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'font-#value' },
      'border-radius':    { type: 'css-value',        required: false, description: 'Rounded corners (ENHANCE).', example: '4px', default: '0', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'rounded-[#value]' },
      'box-shadow':       { type: 'css-value',        required: false, description: 'Drop shadow on the button (ENHANCE — Outlook ignores). Supports single shadow, multi-comma stacked shadows, rgba(), and inset.', example: '0 2px 4px rgba(0,0,0,0.2)', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'shadow-[#value]' },
      'opacity':          { type: 'css-value',        required: false, description: 'Button opacity 0–1 (ENHANCE — Outlook ignores).', example: '0.95', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'opacity-#value' },
      'padding':          { type: 'css-value',        required: false, description: 'Outer padding shorthand.', example: '10px 25px', default: '10px 25px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'p-[#value]' },
      'padding-top':      { type: 'css-value',        required: false, description: 'Top outer padding.', example: '10px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pt-[#value]' },
      'padding-right':    { type: 'css-value',        required: false, description: 'Right outer padding.', example: '25px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pr-[#value]' },
      'padding-bottom':   { type: 'css-value',        required: false, description: 'Bottom outer padding.', example: '10px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pb-[#value]' },
      'padding-left':     { type: 'css-value',        required: false, description: 'Left outer padding.', example: '25px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pl-[#value]' },
      'inner-padding':    { type: 'css-value',        required: false, description: 'Inner padding (VML path).', example: '10px 25px', default: '10px 25px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: '(use py/px utilities on the class)' },
      'width':            { type: 'css-value',        required: false, description: 'Button width.', example: '200px', default: 'auto', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'w-[#value]' },
      'height':           { type: 'css-value',        required: false, description: 'Button height.', example: '48px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'h-[#value]' },
      'align':            { type: 'enum',             required: false, description: 'Horizontal alignment of the button wrapper.', example: 'center', values: ['left', 'center', 'right'], hasEmailCompatibilityNotes: false },
      'vertical-align':   { type: 'enum',             required: false, description: 'Vertical alignment.', example: 'middle', values: ['top', 'middle', 'bottom'], hasEmailCompatibilityNotes: false },
      'text-align':       { type: 'enum',             required: false, description: 'Text alignment inside button.', example: 'center', values: ['left', 'center', 'right', 'justify'], default: 'center', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'text-#value' },
      'text-decoration':  { type: 'enum',             required: false, description: 'Text decoration on the link.', example: 'none', values: ['none', 'underline', 'line-through'], hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'underline or no-underline' },
      'text-transform':   { type: 'enum',             required: false, description: 'Text casing transform.', example: 'uppercase', values: ['none', 'uppercase', 'lowercase', 'capitalize'], hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'uppercase or lowercase' },
      'border':           { type: 'css-value',        required: false, description: 'CSS border shorthand.', example: '2px solid #ffffff', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use style="border: 2px solid #fff")' },
      'line-height':      { type: 'css-value',        required: false, description: 'Line height.', example: '24px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'leading-[#value]' },
      'letter-spacing':   { type: 'css-value',        required: false, description: 'Letter spacing.', example: '0.5px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'tracking-[#value]' },
      'target':           { type: 'enum',             required: false, description: 'Link target.', example: '_blank', values: ['_self', '_blank'], hasEmailCompatibilityNotes: false },
      'rel':              { type: 'string',           required: false, description: 'Link rel attribute.', example: 'noopener noreferrer', hasEmailCompatibilityNotes: false },
      'margin':           { type: 'css-value',        required: false, description: 'Outer margin shorthand around the button wrapper.', example: '16px 0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'm-[#value]' },
      'margin-top':       { type: 'css-value',        required: false, description: 'Top margin on the button wrapper.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'mt-[#value]' },
      'margin-right':     { type: 'css-value',        required: false, description: 'Right margin on the button wrapper.', example: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'mr-[#value]' },
      'margin-bottom':    { type: 'css-value',        required: false, description: 'Bottom margin on the button wrapper.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'mb-[#value]' },
      'margin-left':      { type: 'css-value',        required: false, description: 'Left margin on the button wrapper.', example: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'ml-[#value]' },
      'max-width':        { type: 'css-value',        required: false, description: 'Maximum width of the button wrapper.', example: '300px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'max-w-[#value]' },
    },
  },

  'mc-divider': {
    description: 'Horizontal rule / divider line.',
    category: 'content',
    parent: 'mc-column',
    alternateParents: ['mc-hero'],
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td', 'p'],
    compilerOutputReason: 'p with border-top is the most compatible divider pattern across email clients.',
    validClassCategories: ['border', 'spacing'],
    commonMistakes: [
      'Using border shorthand — specify border-color, border-style, border-width separately',
    ],
    attributes: {
      'class':                        { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: 'border-gray-300', hasEmailCompatibilityNotes: true },
      'id':                           { type: 'string',           required: false, description: 'Unique identifier.', example: 'divider-1', hasEmailCompatibilityNotes: false },
      'border-color':                 { type: 'color',            required: false, description: 'Divider line color.', example: '#e5e7eb', default: '#e5e7eb', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'border-[#value]' },
      'border-style':                 { type: 'enum',             required: false, description: 'Border style.', example: 'solid', values: ['solid', 'dashed', 'dotted', 'double', 'none'], default: 'solid', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'border-#value' },
      'border-width':                 { type: 'css-value',        required: false, description: 'Divider thickness.', example: '1px', default: '1px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'border-[#value]' },
      'padding':                      { type: 'css-value',        required: false, description: 'Vertical spacing shorthand around the divider.', example: '16px 0', default: '16px 0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'p-[#value]' },
      'padding-top':                  { type: 'css-value',        required: false, description: 'Top padding.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pt-[#value]' },
      'padding-right':                { type: 'css-value',        required: false, description: 'Right padding.', example: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pr-[#value]' },
      'padding-bottom':               { type: 'css-value',        required: false, description: 'Bottom padding.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pb-[#value]' },
      'padding-left':                 { type: 'css-value',        required: false, description: 'Left padding.', example: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pl-[#value]' },
      'width':                        { type: 'css-value',        required: false, description: 'Divider width.', example: '100%', default: '100%', hasEmailCompatibilityNotes: false },
      'container-background-color':   { type: 'color',            required: false, description: 'Background of the divider container cell.', example: '#ffffff', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-[#value]' },
    },
  },

  'mc-spacer': {
    description: 'Vertical whitespace block.',
    category: 'content',
    parent: 'mc-column',
    alternateParents: ['mc-hero'],
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Empty table cell with explicit height — the only reliable spacer in Outlook.',
    validClassCategories: ['sizing', 'spacing'],
    commonMistakes: [
      'Using margin-top or padding on sibling elements instead of mc-spacer — inconsistent in email clients',
    ],
    attributes: {
      'class':                        { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: 'h-8', hasEmailCompatibilityNotes: true },
      'id':                           { type: 'string',           required: false, description: 'Unique identifier.', example: 'spacer-1', hasEmailCompatibilityNotes: false },
      'height':                       { type: 'css-value',        required: false, description: 'Height of the spacer.', example: '32px', default: '20px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'h-[#value]' },
      'padding':                      { type: 'css-value',        required: false, description: 'Padding (rarely needed on spacer).', example: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'p-[#value]' },
      'padding-top':                  { type: 'css-value',        required: false, description: 'Top padding.', example: '0', hasEmailCompatibilityNotes: false },
      'padding-right':                { type: 'css-value',        required: false, description: 'Right padding.', example: '0', hasEmailCompatibilityNotes: false },
      'padding-bottom':               { type: 'css-value',        required: false, description: 'Bottom padding.', example: '0', hasEmailCompatibilityNotes: false },
      'padding-left':                 { type: 'css-value',        required: false, description: 'Left padding.', example: '0', hasEmailCompatibilityNotes: false },
      'container-background-color':   { type: 'color',            required: false, description: 'Background color of the spacer cell.', example: '#ffffff', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-[#value]' },
    },
  },

  'mc-table': {
    description: 'Data table with full Tailwind CSS processing on every cell, row, and section.',
    category: 'content',
    parent: 'mc-column',
    maxChildren: Infinity,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th'],
    compilerOutputReason: 'Semantic HTML table — NOT a layout table. role="table" is auto-injected. Tailwind classes on table/tr/td/th are all resolved to inline styles.',
    validClassCategories: ['typography', 'background', 'border', 'spacing', 'sizing'],
    commonMistakes: [
      'Placing mc-* components (mc-text, mc-button) inside <td> — use plain HTML instead',
      'Nesting mc-table inside another mc-table — not supported',
      'Forgetting <th> elements — hurts screen reader accessibility',
      'Using display:flex or display:grid inside cells — breaks email table rendering',
    ],
    attributes: {
      'class':       { type: 'tailwind-classes', required: false, description: 'Tailwind utility classes applied to the <table> element.', example: 'w-full text-sm', hasEmailCompatibilityNotes: true },
      'width':       { type: 'css-value',        required: false, description: 'Table width. Outputs both width HTML attr and CSS.', example: '100%', default: '100%', hasEmailCompatibilityNotes: false },
      'cellpadding': { type: 'number',           required: false, description: 'HTML cellpadding attribute — required for Outlook.', example: '0', default: '0', hasEmailCompatibilityNotes: true },
      'cellspacing': { type: 'number',           required: false, description: 'HTML cellspacing attribute — required for Outlook.', example: '0', default: '0', hasEmailCompatibilityNotes: true },
      'border':      { type: 'string',           required: false, description: 'HTML border attribute (e.g. "0").', example: '0', hasEmailCompatibilityNotes: false },
      'align':       { type: 'enum',             required: false, description: 'Table horizontal alignment (HTML attr fallback).', example: 'left', values: ['left', 'center', 'right'], hasEmailCompatibilityNotes: false },
      'role':        { type: 'string',           required: false, description: 'ARIA role. Defaults to "table". NEVER set to "presentation" — this is a data table.', example: 'table', default: 'table', hasEmailCompatibilityNotes: false },
      'style':       { type: 'string',           required: false, description: 'Raw inline CSS merged with class-derived styles.', example: 'border-collapse:collapse;', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-hero': {
    description: 'Full-width banner with background image support. Uses VML in Outlook, CSS background-image in modern clients.',
    category: 'container',
    parent: 'mc-body',
    alternateParents: [],
    maxChildren: Infinity,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td', 'div', 'v:rect', 'v:fill', 'v:textbox'],
    compilerOutputReason: 'Dual CSS+VML output: CSS background-image div for modern clients, VML v:rect+v:fill for Outlook desktop which ignores CSS background-image on non-table elements.',
    validClassCategories: ['background', 'spacing', 'sizing', 'effects'],
    commonMistakes: [
      'Nesting mc-section or mc-column inside mc-hero — place content components (mc-text, mc-button) directly inside mc-hero',
      'Setting background-image without background-color — Outlook will show a white background instead of the image',
      'Using a relative URL for background-image — must be an absolute URL for email clients to load the image',
    ],
    attributes: {
      'background-image':    { type: 'url',              required: false, description: 'Absolute URL of the background image. Triggers dual CSS+VML output for Outlook compatibility.', example: 'https://example.com/hero.jpg', hasEmailCompatibilityNotes: true },
      'background-color':    { type: 'color',            required: false, description: 'Background color. Required as Outlook VML fallback when background-image is set.', example: '#1e293b', default: '#ffffff', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-[#value]' },
      'background-position': { type: 'enum',             required: false, description: 'Background image position (CSS only — Outlook VML always stretches to fill).', example: 'center', values: ['top', 'center', 'bottom', 'left', 'right'], default: 'center', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-#value' },
      'background-size':     { type: 'enum',             required: false, description: 'Background image size (CSS only — Outlook VML always stretches to fill).', example: 'cover', values: ['cover', 'contain', 'auto'], default: 'cover', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-#value' },
      'height':              { type: 'css-value',        required: false, description: 'Hero height. Must be a fixed pixel value for Outlook VML (e.g. 300px).', example: '300px', default: '300px', hasEmailCompatibilityNotes: true },
      'padding':             { type: 'css-value',        required: false, description: 'Inner padding around hero content.', example: '60px 40px', default: '40px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'p-[#value]' },
      'align':               { type: 'enum',             required: false, description: 'Horizontal alignment of hero content.', example: 'center', values: ['left', 'center', 'right'], default: 'center', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'text-#value' },
      'vertical-align':      { type: 'enum',             required: false, description: 'Vertical alignment of hero content.', example: 'middle', values: ['top', 'middle', 'bottom'], default: 'middle', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'align-#value' },
      'width':               { type: 'css-value',        required: false, description: 'Hero width in pixels. Defaults to the email config width (600px). Used for Outlook VML dimensions.', example: '600px', hasEmailCompatibilityNotes: true },
      'full-width':          { type: 'boolean',          required: false, description: 'Extend background to full viewport width. VML fallback shows solid background-color only (no image).', example: 'true', default: 'false', hasEmailCompatibilityNotes: true },
      'class':               { type: 'tailwind-classes', required: false, description: 'Tailwind utility classes. bg-* and p-* classes are extracted as background-color and padding.', example: 'bg-slate-800 p-10', hasEmailCompatibilityNotes: true },
      'style':               { type: 'string',           required: false, description: 'Raw inline CSS merged with class-derived styles. Explicit style wins over class-derived values.', example: 'border-radius:8px;', hasEmailCompatibilityNotes: false },
      'border-radius':       { type: 'css-value',        required: false, description: 'Rounded corners on the CSS background div. CSS only — Outlook ignores border-radius.', example: '8px', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'rounded-[#value]' },
      'overlay-color':       { type: 'color',            required: false, description: 'Absolute-positioned colour overlay on top of the background image. rgba() supported. CSS only.', example: 'rgba(0,0,0,0.4)', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use style="background-color: rgba(0,0,0,0.4)" on inner element)' },
      'aria-label':          { type: 'string',           required: false, description: 'Accessible label for the hero region. Adds role="region" aria-label to the hero content div.', example: 'Product hero banner', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-raw': {
    description: 'Passthrough — content is emitted as-is with no transformation.',
    category: 'content',
    parent: 'mc-column',
    alternateParents: ['mc-body', 'mc-section', 'root'],
    maxChildren: 0,
    allowsTextContent: true,
    compilerOutputElements: [],
    compilerOutputReason: 'No transformation — content is written directly to output.',
    validClassCategories: [],
    commonMistakes: [
      'Putting malformed HTML inside mc-raw — it will break the output silently',
      'Using mc-raw when a proper component exists — reduces portability',
    ],
    attributes: {
      'class': { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: 'hidden', hasEmailCompatibilityNotes: true },
      'id':    { type: 'string',           required: false, description: 'Unique identifier.', example: 'raw-block', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-list': {
    description: 'Ordered or unordered list. Children must be mc-list-item.',
    category: 'content',
    parent: 'mc-column',
    alternateParents: ['mc-hero'],
    maxChildren: Infinity,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td', 'ul', 'ol', 'li'],
    compilerOutputReason: 'Outer table normalises Outlook list rendering; ul/ol/li for semantic markup.',
    validClassCategories: ['typography', 'background', 'spacing'],
    commonMistakes: [
      'Putting non-mc-list-item children in mc-list',
      'Styling the <ul> via inline HTML inside mc-text — class on inline tags is not resolved',
    ],
    attributes: {
      'class':            { type: 'tailwind-classes', required: false, description: 'Utility classes (e.g. list-disc, list-decimal, text-gray-700).', example: 'list-disc text-gray-700', hasEmailCompatibilityNotes: true },
      'id':               { type: 'string',           required: false, description: 'Unique identifier.', example: 'features-list', hasEmailCompatibilityNotes: false },
      'type':             { type: 'enum',             required: false, description: 'List type.', example: 'ul', values: ['ul', 'ol'], default: 'ul', hasEmailCompatibilityNotes: false },
      'list-style-type':  { type: 'enum',             required: false, description: 'Bullet/numbering style.', example: 'disc', values: ['disc', 'circle', 'square', 'decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman', 'none'], hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'list-#value' },
      'list-style-position': { type: 'enum',          required: false, description: 'Bullet position.', example: 'outside', values: ['inside', 'outside'], default: 'outside', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'list-#value' },
      'color':            { type: 'color',            required: false, description: 'Text color for all items.', example: '#333333', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'text-[#value]' },
      'background-color': { type: 'color',            required: false, description: 'Background color of the list.', example: '#f5f5f5', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-[#value]' },
      'font-family':      { type: 'string',           required: false, description: 'Font family.', example: 'Georgia, serif', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: '(use mc-attributes for global font-family)' },
      'font-size':        { type: 'css-value',        required: false, description: 'Font size.', example: '16px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'text-[#value]' },
      'font-weight':      { type: 'enum',             required: false, description: 'Font weight.', example: 'normal', values: ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'], hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'font-#value' },
      'line-height':      { type: 'css-value',        required: false, description: 'Line height.', example: '1.6', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'leading-[#value]' },
      'letter-spacing':   { type: 'css-value',        required: false, description: 'Letter spacing.', example: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'tracking-[#value]' },
      'padding':          { type: 'css-value',        required: false, description: 'Padding around the list block.', example: '8px 0', default: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'p-[#value]' },
      'padding-top':      { type: 'css-value',        required: false, description: 'Top padding.', example: '8px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pt-[#value]' },
      'padding-right':    { type: 'css-value',        required: false, description: 'Right padding.', example: '0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pr-[#value]' },
      'padding-bottom':   { type: 'css-value',        required: false, description: 'Bottom padding.', example: '8px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pb-[#value]' },
      'padding-left':     { type: 'css-value',        required: false, description: 'Left padding (controls bullet indent).', example: '24px', default: '24px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'pl-[#value]' },
      'item-spacing':     { type: 'css-value',        required: false, description: 'Vertical spacing between items.', example: '4px', default: '4px', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-list-item': {
    description: 'Single list item inside mc-list. Accepts inline HTML.',
    category: 'content',
    parent: 'mc-list',
    maxChildren: 0,
    allowsTextContent: true,
    compilerOutputElements: ['li'],
    compilerOutputReason: 'Semantic <li> tag; inline styles inherit from mc-list when not overridden.',
    validClassCategories: ['typography', 'background', 'spacing'],
    commonMistakes: [
      'Using mc-list-item outside mc-list',
      'Adding block-level mc-* components inside an item — only inline HTML is supported',
    ],
    attributes: {
      'class':              { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: 'text-gray-900', hasEmailCompatibilityNotes: true },
      'id':                 { type: 'string',           required: false, description: 'Unique identifier.', example: 'item-1', hasEmailCompatibilityNotes: false },
      'color':              { type: 'color',            required: false, description: 'Text color.', example: '#333333', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'text-[#value]' },
      'background-color':   { type: 'color',            required: false, description: 'Item background color.', example: '#f5f5f5', hasEmailCompatibilityNotes: true, isCssPropAttr: true, classHint: 'bg-[#value]' },
      'font-size':          { type: 'css-value',        required: false, description: 'Font size for this item. Overrides the inherited size from mc-list.', example: '14px', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'text-[#value]' },
      'line-height':        { type: 'css-value',        required: false, description: 'Line height for this item. Overrides the inherited leading from mc-list.', example: '1.6', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'leading-[#value]' },
      'font-weight':        { type: 'enum',             required: false, description: 'Font weight.', example: 'bold', values: ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'], hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'font-#value' },
      'font-style':         { type: 'enum',             required: false, description: 'Font style.', example: 'italic', values: ['normal', 'italic', 'oblique'], hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'italic' },
      'text-decoration':    { type: 'enum',             required: false, description: 'Text decoration.', example: 'none', values: ['none', 'underline', 'line-through'], hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'underline' },
      'padding':            { type: 'css-value',        required: false, description: 'Padding around the item content.', example: '4px 0', hasEmailCompatibilityNotes: false, isCssPropAttr: true, classHint: 'p-[#value]' },
    },
  },

  // ── Logic / control flow ────────────────────────────────────────────────

  'mc-if': {
    description: 'Conditional block. Renders children only when condition is truthy.',
    category: 'logic',
    parent: null,
    maxChildren: Infinity,
    allowsTextContent: false,
    compilerOutputElements: [],
    compilerOutputReason: 'Compile-time conditional — no HTML wrapper emitted.',
    validClassCategories: [],
    commonMistakes: ['Using JavaScript expressions in condition — only template variables supported'],
    attributes: {
      'class':     { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: '', hasEmailCompatibilityNotes: false },
      'id':        { type: 'string',           required: false, description: 'Unique identifier.', example: '', hasEmailCompatibilityNotes: false },
      'condition': { type: 'string',           required: true,  description: 'Template expression evaluated at render time.', example: 'user.plan === "pro"', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-else-if': {
    description: 'Else-if branch for an mc-if chain.',
    category: 'logic',
    parent: null,
    maxChildren: Infinity,
    allowsTextContent: false,
    mustFollow: ['mc-if', 'mc-else-if'],
    compilerOutputElements: [],
    compilerOutputReason: 'Compile-time conditional — no HTML wrapper emitted.',
    validClassCategories: [],
    commonMistakes: ['Using mc-else-if without a preceding mc-if'],
    attributes: {
      'class':     { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: '', hasEmailCompatibilityNotes: false },
      'id':        { type: 'string',           required: false, description: 'Unique identifier.', example: '', hasEmailCompatibilityNotes: false },
      'condition': { type: 'string',           required: true,  description: 'Template expression.', example: 'user.plan === "free"', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-else': {
    description: 'Else branch for an mc-if chain.',
    category: 'logic',
    parent: null,
    maxChildren: Infinity,
    allowsTextContent: false,
    mustFollow: ['mc-if', 'mc-else-if'],
    compilerOutputElements: [],
    compilerOutputReason: 'Compile-time conditional — no HTML wrapper emitted.',
    validClassCategories: [],
    commonMistakes: ['Using mc-else without a preceding mc-if'],
    attributes: {
      'class': { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: '', hasEmailCompatibilityNotes: false },
      'id':    { type: 'string',           required: false, description: 'Unique identifier.', example: '', hasEmailCompatibilityNotes: false },
    },
  },

  'mc-each': {
    description: 'Loop over an array. Renders children for each item.',
    category: 'logic',
    parent: null,
    maxChildren: Infinity,
    allowsTextContent: false,
    compilerOutputElements: [],
    compilerOutputReason: 'Compile-time loop — no HTML wrapper emitted.',
    validClassCategories: [],
    commonMistakes: ['Using mc-each without providing the items variable in template data'],
    attributes: {
      'class': { type: 'tailwind-classes', required: false, description: 'Utility classes.', example: '', hasEmailCompatibilityNotes: false },
      'id':    { type: 'string',           required: false, description: 'Unique identifier.', example: '', hasEmailCompatibilityNotes: false },
      'items': { type: 'string',           required: true,  description: 'Array variable name from template data.', example: 'products', hasEmailCompatibilityNotes: false },
      'as':    { type: 'string',           required: true,  description: 'Variable name for each item.', example: 'product', hasEmailCompatibilityNotes: false },
      'index': { type: 'string',           required: false, description: 'Variable name for the loop index.', example: 'i', hasEmailCompatibilityNotes: false },
    },
  },

};

// ---------------------------------------------------------------------------
// Derivation helpers
// ---------------------------------------------------------------------------

/**
 * Derives a ComponentRule from the canonical metadata entry.
 *
 * The validator calls this so there is no manual duplication of
 * parent / required / knownAttributes data.
 *
 * @param type - The mc-* component name (e.g. "mc-else-if")
 * @returns The corresponding ComponentRule
 * @throws If type is not found in COMPONENT_METADATA
 */
export function deriveComponentRule(type: string): ComponentRule {
  const meta = COMPONENT_METADATA[type];
  if (!meta) {
    throw new Error(`deriveComponentRule: unknown component type "${type}"`);
  }
  return deriveComponentRuleFromMetadata(meta);
}

/**
 * Same as `deriveComponentRule()` but accepts the metadata object directly
 * instead of looking it up by name in `COMPONENT_METADATA`. Used by callers
 * that pull metadata from the runtime component registry (so plugin-registered
 * components participate in validation).
 */
export function deriveComponentRuleFromMetadata(meta: ComponentMetadata): ComponentRule {
  const rule: ComponentRule = {
    parent: meta.parent,
    maxChildren: meta.maxChildren,
    required: Object.entries(meta.attributes)
      .filter(([, a]) => a.required)
      .map(([name]) => name),
    knownAttributes: Object.keys(meta.attributes),
  };

  if (meta.alternateParents !== undefined) {
    rule.alternateParents = meta.alternateParents;
  }

  if (meta.mustFollow !== undefined) {
    rule.mustFollow = meta.mustFollow;
  }

  return rule;
}

/**
 * Derives the DEFAULTS record for a compiler component from the canonical
 * metadata entry. Only attributes with a defined default value are included.
 *
 * Each compiler component calls this instead of declaring its own DEFAULTS
 * constant. To change a default value, edit COMPONENT_METADATA — not the
 * compiler file.
 *
 * @param type - The mc-* component name (e.g. "mc-button")
 * @returns Record of attribute-name → default-value for this component
 * @throws If type is not found in COMPONENT_METADATA
 */
export function deriveDefaults(type: string): Record<string, string> {
  const meta = COMPONENT_METADATA[type];
  if (!meta) {
    throw new Error(`deriveDefaults: unknown component type "${type}"`);
  }
  return Object.fromEntries(
    Object.entries(meta.attributes)
      .filter(([, a]) => a.default !== undefined)
      .map(([name, a]) => [name, a.default as string]),
  );
}
