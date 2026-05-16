/**
 * JSON schema types for the mailc JSON → Email API.
 *
 * MCNode is the JSON representation of an email component.
 * MCDocument wraps MCNode with metadata and optional data schema.
 * These types are the contract between visual builders and `compileFromJSON()`.
 *
 * @module json/schema
 */

// ---------------------------------------------------------------------------
// Component Type Unions
// ---------------------------------------------------------------------------

/** All supported mc-* component types. */
export type MCComponentType =
  | 'mc'
  | 'mc-body'
  | 'mc-head'
  | 'mc-attributes'
  | 'mc-style'
  | 'mc-preview'
  | 'mc-section'
  | 'mc-column'
  | 'mc-text'
  | 'mc-image'
  | 'mc-button'
  | 'mc-divider'
  | 'mc-spacer'
  | 'mc-raw'
  | 'mc-table'
  | 'mc-hero'
  | 'mc-title'
  | 'mc-list'
  | 'mc-list-item';

/** Logic/template node types. */
export type MCLogicType = 'mc-if' | 'mc-else-if' | 'mc-else' | 'mc-each';

/** Head-internal attribute target types (children of mc-attributes). */
export type MCAttributeTargetType =
  | 'mc-all'
  | 'mc-text'
  | 'mc-button'
  | 'mc-image'
  | 'mc-section'
  | 'mc-column'
  | 'mc-divider'
  | 'mc-spacer'
  | 'mc-list'
  | 'mc-list-item'
  | 'mc-class';

/** All valid node types. */
export type MCNodeType = MCComponentType | MCLogicType | MCAttributeTargetType;

/**
 * Any component type — built-in OR plugin-registered via `defineComponent()`.
 *
 * `MCComponentType` is intentionally a closed union of built-ins. Plugin
 * authors who need to type custom-component nodes should use `MCAnyComponentType`
 * (which is `string`) — the runtime registry is the gate, not the static type.
 *
 * @see defineComponent (src/define-component.ts)
 */
export type MCAnyComponentType = MCComponentType | (string & {});

// ---------------------------------------------------------------------------
// MCNode — A single node in the JSON tree
// ---------------------------------------------------------------------------

/**
 * A single node in the mailc JSON tree.
 *
 * This is the JSON equivalent of an ASTNode. Visual builders
 * produce trees of MCNode objects, and `compileFromJSON()` compiles
 * them directly into email-safe HTML.
 */
export interface MCNode {
  /** Unique ID for builder targeting (drag-drop, selection, etc.). */
  id?: string;
  /** Component type: "mc-body", "mc-text", "mc-button", etc. */
  type: string;
  /** Key-value attribute pairs. All values are strings. */
  attributes: Record<string, string>;
  /** Child nodes (for container components like mc-section, mc-column). */
  children?: MCNode[];
  /** Text content (for leaf components: mc-text, mc-button, mc-preview, mc-raw, mc-style). */
  content?: string;
  /**
   * Source location of this node in the original JSON string.
   *
   * Populated only when `compileFromJSON()` is called with a JSON STRING input
   * (the position-tracking parser attaches it). Object-input callers leave
   * this undefined — `jsonToAST` falls back to a synthetic loc, preserving
   * existing behavior.
   *
   * The loc flows through to source map entries' `sourceLoc`, enabling
   * source-line click-to-highlight in JSON-aware tools (playgrounds, IDE
   * extensions). 1-based line/col, 0-based offset.
   */
  loc?: {
    start: { line: number; col: number; offset: number };
    end: { line: number; col: number; offset: number };
  };
}

// ---------------------------------------------------------------------------
// MCDocument — Full document wrapper
// ---------------------------------------------------------------------------

/**
 * Template metadata for builder storage/display.
 */
export interface MCMetadata {
  /** Unique template ID. */
  id: string;
  /** Human-readable template name. */
  name: string;
  /** Template description. */
  description?: string;
  /** ISO date string — when the template was created. */
  created: string;
  /** ISO date string — when the template was last updated. */
  updated: string;
}

/**
 * Schema field definition for the data schema.
 * Describes the shape of template variables for builder UI (variable dropdowns, etc.).
 */
export interface SchemaField {
  /** Field type. */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** Human-readable label for builder UI. */
  label?: string;
  /** Whether the field is optional. */
  optional?: boolean;
  /** Nested properties (for type: 'object'). */
  properties?: Record<string, SchemaField>;
  /** Item schema (for type: 'array'). */
  itemSchema?: Record<string, SchemaField>;
}

/** Data schema type — a map of top-level variable names to their schema. */
export type MCDataSchema = Record<string, SchemaField>;

/**
 * A complete mailc document — the top-level JSON that builders produce.
 *
 * Contains:
 * - Version string for forward compatibility.
 * - Metadata for storage/display.
 * - Optional data schema describing available template variables.
 * - Optional sample data for previewing in the builder.
 * - The template tree (MCNode) — the actual email structure.
 */
export interface MCDocument {
  /** Schema version. Currently "1.0". */
  version: string;
  /** Template metadata. */
  metadata: MCMetadata;
  /** Optional schema describing available template variables. */
  dataSchema?: MCDataSchema;
  /** Optional sample data matching the dataSchema shape. */
  sampleData?: Record<string, unknown>;
  /** The root MCNode — should be of type "mc". */
  template: MCNode;
}
