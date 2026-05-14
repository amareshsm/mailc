/**
 * SourceMapCollector — accumulates structured source-map entries during compilation.
 *
 * Used when `options.debug === true`. Every mc-* component compiled by
 * `compileNode()` calls `enter()` before compilation and `leave()` after,
 * producing one `SourceMapEntry` per component.
 *
 * Sub-elements within a component compiler (e.g. the `<table>` produced by
 * `mc-section`) can call `emit()` to add child entries with a given role.
 *
 * Browser-safe: zero `node:*` imports.
 *
 * @module compiler/source-map-collector
 */

import type {
  ASTNode,
  EmailSourceMap,
  ExpressionResolution,
  ConditionalInfo,
  LoopInfo,
  OutputRole,
  SourceMapEntry,
  StyleOrigin,
} from '../types.js';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

/**
 * Contract for source map collectors.
 *
 * Both `SourceMapCollector` (active, debug mode) and
 * `NullSourceMapCollector` (no-op, production mode) implement this interface,
 * so the compiler never needs to branch on `debug`.
 */
export interface ISourceMapCollector {
  /**
   * Starts tracking a new mc-* component entry.
   *
   * @param node      - The AST node being compiled.
   * @param component - The component type string, e.g. "mc-section".
   * @returns A unique entry ID to pass to `leave()` and `emit()`.
   */
  enter(node: ASTNode, component: string): string;

  /**
   * Marks a component entry as closed (compilation finished).
   *
   * @param id - The ID returned by `enter()`.
   */
  leave(id: string): void;

  /**
   * Emits a child entry for a sub-element produced by a component compiler.
   *
   * Example: `mc-section` emits `container-table`, `container-row`, etc.
   *
   * @param parentId - ID of the parent entry (from `enter()`).
   * @param role     - The role this output element plays.
   * @param tag      - The HTML tag name, e.g. "table".
   * @returns A unique entry ID for the emitted element.
   */
  emit(parentId: string, role: OutputRole, tag: string): string;

  /**
   * Adds a style origin record to an existing entry.
   *
   * @param id    - The entry ID.
   * @param style - The style origin to record.
   */
  addStyle(id: string, style: StyleOrigin): void;

  /**
   * Adds an expression resolution record to an existing entry.
   *
   * @param id   - The entry ID.
   * @param expr - The expression resolution to record.
   */
  addExpression(id: string, expr: ExpressionResolution): void;

  /**
   * Sets conditional branch info on an existing entry.
   *
   * @param id   - The entry ID.
   * @param info - The conditional branch info.
   */
  setConditional(id: string, info: ConditionalInfo): void;

  /**
   * Sets loop iteration info on an existing entry.
   *
   * @param id   - The entry ID.
   * @param info - The loop info.
   */
  setLoop(id: string, info: LoopInfo): void;

  /**
   * Builds the final `EmailSourceMap` object from all accumulated entries.
   *
   * @param meta - Top-level metadata for the map.
   * @returns The complete source map, or `null` if this is a no-op collector.
   */
  build(meta: {
    sourceFile: string;
    outputFile: string;
    templateData: unknown;
    mailcVersion: string;
    inputSize: number;
    outputSize: number;
  }): EmailSourceMap | null;

  /**
   * The ID of the most recently started (entered) entry that has not yet been
   * left. Used by `collectAndInline()` to attach style provenance without
   * needing an explicit ID parameter.
   *
   * Returns an empty string when no entry is currently active.
   */
  readonly activeEntryId: string;
}

// ---------------------------------------------------------------------------
// Active implementation
// ---------------------------------------------------------------------------

/**
 * Active source map collector used when `debug: true`.
 *
 * Maintains an internal ID counter and an entry map. The entry stack tracks
 * nesting so that `emit()` can always find the current parent.
 */
export class SourceMapCollector implements ISourceMapCollector {
  private counter = 0;
  private entries = new Map<string, SourceMapEntry>();
  private rootIds: string[] = [];
  /** Stack of active entry IDs — top is the current active entry. */
  private _activeStack: string[] = [];

  /** The ID of the currently active (entered, not yet left) entry. */
  get activeEntryId(): string {
    return this._activeStack[this._activeStack.length - 1] ?? '';
  }

  /** Generates a new unique entry ID. */
  private nextId(): string {
    this.counter += 1;
    return `entry-${this.counter}`;
  }

  /**
   * Resolves the entry id to use for a node:
   * - If `node.id` is a non-empty string AND not already in use, return it.
   *   (JSON-sourced builder identity flows straight through to `data-mc-id`.)
   * - Otherwise fall back to the sequential `entry-N` counter.
   *
   * Markup-input nodes (no `node.id`) preserve existing behavior. Builders
   * that accidentally emit duplicate ids degrade gracefully to counter ids
   * for the colliding nodes rather than overwriting prior entries.
   */
  private resolveEntryId(node: ASTNode): string {
    if (node.id && node.id.length > 0 && !this.entries.has(node.id)) {
      return node.id;
    }
    return this.nextId();
  }

  /**
   * Starts tracking a new mc-* component entry.
   *
   * @param node      - The AST node being compiled.
   * @param component - The component type string.
   * @returns The new entry ID.
   */
  enter(node: ASTNode, component: string): string {
    const id = this.resolveEntryId(node);
    // Determine initial role from component type
    const role: OutputRole = component === '_mc-loop-iteration' ? 'loop-iteration'
      : component === '_mc-conditional-branch' ? 'conditional-branch'
      : 'content';
    // Resolve parent from the active stack
    const parentId = this._activeStack[this._activeStack.length - 1] ?? null;
    const entry: SourceMapEntry = {
      id,
      parentId,
      sourceComponent: component,
      sourceLoc: {
        startLine: node.loc.start.line,
        startCol: node.loc.start.col,
        endLine: node.loc.end.line,
        endCol: node.loc.end.col,
      },
      role,
      outputTag: '',
      outputRange: null,
      outputLoc: null,
      styles: [],
      expressions: [],
      conditional: null,
      loop: null,
      sourceAttributes: { ...node.attributes },
      children: [],
    };
    this.entries.set(id, entry);
    // Register as root only if there is no parent
    if (parentId === null) {
      this.rootIds.push(id);
    } else {
      // Add to the parent's children list
      const parent = this.entries.get(parentId);
      if (parent) {
        parent.children.push(id);
      }
    }
    this._activeStack.push(id);
    return id;
  }

  /**
   * Closes a component entry (compilation finished).
   *
   * @param id - The ID returned by `enter()`.
   */
  leave(id: string): void {
    const top = this._activeStack[this._activeStack.length - 1];
    if (top === id) {
      this._activeStack.pop();
    }
  }

  /**
   * Emits a child entry for a sub-element produced by a component compiler.
   *
   * @param parentId - ID of the parent entry.
   * @param role     - The role this output element plays.
   * @param tag      - The HTML tag name.
   * @returns The new child entry ID.
   */
  emit(parentId: string, role: OutputRole, tag: string): string {
    const id = this.nextId();
    const parent = this.entries.get(parentId);
    const entry: SourceMapEntry = {
      id,
      parentId,
      sourceComponent: parent?.sourceComponent ?? '',
      sourceLoc: parent?.sourceLoc ?? { startLine: 0, startCol: 0, endLine: 0, endCol: 0 },
      role,
      outputTag: tag,
      outputRange: null,
      outputLoc: null,
      styles: [],
      expressions: [],
      conditional: null,
      loop: null,
      sourceAttributes: {},
      children: [],
    };
    this.entries.set(id, entry);
    if (parent) {
      parent.children.push(id);
    }
    return id;
  }

  /**
   * Adds a style origin record to an entry.
   *
   * @param id    - The entry ID.
   * @param style - The style origin.
   */
  addStyle(id: string, style: StyleOrigin): void {
    this.entries.get(id)?.styles.push(style);
  }

  /**
   * Adds an expression resolution record to an entry.
   *
   * @param id   - The entry ID.
   * @param expr - The expression resolution.
   */
  addExpression(id: string, expr: ExpressionResolution): void {
    this.entries.get(id)?.expressions.push(expr);
  }

  /**
   * Sets conditional branch info on an entry.
   *
   * @param id   - The entry ID.
   * @param info - The conditional info.
   */
  setConditional(id: string, info: ConditionalInfo): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.conditional = info;
    }
  }

  /**
   * Sets loop iteration info on an entry.
   *
   * @param id   - The entry ID.
   * @param info - The loop info.
   */
  setLoop(id: string, info: LoopInfo): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.loop = info;
    }
  }

  /**
   * Builds the final `EmailSourceMap` from all accumulated entries.
   *
   * @param meta - Top-level metadata.
   * @returns The complete source map.
   */
  build(meta: {
    sourceFile: string;
    outputFile: string;
    templateData: unknown;
    mailcVersion: string;
    inputSize: number;
    outputSize: number;
  }): EmailSourceMap {
    const allEntries = Array.from(this.entries.values());
    const sourceComponents = allEntries.filter(
      (e) => e.parentId === null,
    ).length;
    const expansionRatio =
      meta.inputSize > 0
        ? Math.round((meta.outputSize / meta.inputSize) * 100) / 100
        : 1;

    return {
      version: 1,
      sourceFile: meta.sourceFile,
      outputFile: meta.outputFile,
      templateData: meta.templateData,
      mailcVersion: meta.mailcVersion,
      entries: allEntries,
      stats: {
        sourceComponents,
        outputElements: allEntries.length,
        expansionRatio,
      },
    };
  }
}
