/**
 * TipTap inline editor for the selected leaf node.
 *
 * Bridge: preview-iframe click → `selectedEntryId` → SourceMapEntry →
 * MCNode (found by DFS-matching `loc.start.{line,col}` in `parsedJson`)
 * → TipTap editor seeded with `node.content`. Keystrokes clone the tree,
 * mutate the content, and call `setSourceFromTree(...)` to recompile.
 *
 * Plain-text only. Variable chips, inline marks, and in-iframe WYSIWYG
 * are out of scope.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Edit3 } from 'lucide-react'
import type { MCNode } from 'mailc'
import { useJsonPlaygroundStore } from '@/store/json-playground-store'
import type { SourceMapEntry } from '@/types/source-map'

/**
 * Node types whose `content` is a plain string we know how to round-trip
 * through TipTap. Other components carry their content via `children`
 * (sections, columns, lists, …) — those use the regular attributes panel.
 */
const EDITABLE_CONTENT_TYPES = new Set([
  'mc-text',
  'mc-button',
  'mc-preview',
  'mc-title',
])

/**
 * Walk the source-map entry chain upward via `parentId` until we find an
 * ancestor whose `sourceComponent` is a content-bearing leaf type. Inspect
 * mode often lands on a sub-element (responsive-wrapper, content-wrapper,
 * an `<a>` inside a button …) and we want to resolve it to the user's
 * source node.
 */
function walkUpToContentOwner(
  entry: SourceMapEntry | null,
  entries: SourceMapEntry[],
): SourceMapEntry | null {
  let cur: SourceMapEntry | null = entry
  while (cur) {
    if (EDITABLE_CONTENT_TYPES.has(cur.sourceComponent)) return cur
    if (!cur.parentId) return null
    cur = entries.find((e) => e.id === cur!.parentId) ?? null
  }
  return null
}

interface MCNodeWithLoc extends MCNode {
  loc?: {
    start: { line: number; col: number; offset: number }
    end: { line: number; col: number; offset: number }
  }
}

/**
 * DFS the parsed tree, returning the first node whose `loc.start` matches
 * `sourceLoc.startLine` AND `startCol`. We require both because two nodes
 * can legitimately start on the same line in compact JSON.
 *
 * Returns the node AND its parent + index — enough to splice a replacement
 * back into the tree without rebuilding it.
 */
function findNodeByLoc(
  root: MCNode | null,
  targetLine: number,
  targetCol: number,
): { node: MCNodeWithLoc; path: number[] } | null {
  if (!root) return null
  const path: number[] = []
  function walk(n: MCNodeWithLoc): { node: MCNodeWithLoc; path: number[] } | null {
    const loc = n.loc
    if (loc && loc.start.line === targetLine && loc.start.col === targetCol) {
      return { node: n, path: [...path] }
    }
    if (n.children) {
      for (let i = 0; i < n.children.length; i++) {
        path.push(i)
        const found = walk(n.children[i] as MCNodeWithLoc)
        path.pop()
        if (found) return found
      }
    }
    return null
  }
  return walk(root as MCNodeWithLoc)
}

/**
 * Produce a fresh tree where the node at `path` has its `content` replaced.
 * Immutable — every node along the path is shallow-cloned so React refs
 * stay coherent if the tree is ever rendered upstream.
 */
function replaceContentAtPath(root: MCNode, path: number[], newContent: string): MCNode {
  if (path.length === 0) {
    return { ...root, content: newContent }
  }
  const [head, ...rest] = path
  const children = root.children ?? []
  const target = children[head]
  if (!target) return root
  const newChildren = [...children]
  newChildren[head] = replaceContentAtPath(target, rest, newContent)
  return { ...root, children: newChildren }
}

/**
 * `editor.getText()` reads `editor.schema.spec.nodes` under the hood. During
 * a recreate (selection change, hot-reload) there is a render tick where the
 * editor reference is non-null but its schema is null — calling getText then
 * throws `Cannot read properties of null (reading 'nodes')`. We swallow that
 * and let the next render retry; by then the schema is settled.
 */
function safeGetText(editor: Editor): string | null {
  if (editor.isDestroyed) return null
  try {
    return editor.getText({ blockSeparator: '\n' })
  } catch {
    return null
  }
}

/* ── Component ────────────────────────────────────────────────────────── */

export function EditTextTab() {
  const selectedEntryId = useJsonPlaygroundStore((s) => s.selectedEntryId)
  const sourceMap = useJsonPlaygroundStore((s) => s.sourceMap)
  const parsedJson = useJsonPlaygroundStore((s) => s.parsedJson)
  const setSourceFromTree = useJsonPlaygroundStore((s) => s.setSourceFromTree)

  // Resolve the click target to the owning content-bearing source node.
  const target = useMemo(() => {
    if (!selectedEntryId || !sourceMap || !parsedJson) return null
    const entry = sourceMap.entries.find((e) => e.id === selectedEntryId) ?? null
    const contentEntry = walkUpToContentOwner(entry, sourceMap.entries)
    if (!contentEntry) return null
    const hit = findNodeByLoc(
      parsedJson,
      contentEntry.sourceLoc.startLine,
      contentEntry.sourceLoc.startCol,
    )
    if (!hit) return null
    return { entry: contentEntry, ...hit }
  }, [selectedEntryId, sourceMap, parsedJson])

  // Stable refs for callbacks the editor needs — they change on every render
  // but we don't want that to recreate the editor (which would destroy the
  // user's caret position and undo stack mid-keystroke).
  const targetRef = useRef(target)
  const parsedJsonRef = useRef(parsedJson)
  const setSourceFromTreeRef = useRef(setSourceFromTree)
  useEffect(() => {
    targetRef.current = target
    parsedJsonRef.current = parsedJson
    setSourceFromTreeRef.current = setSourceFromTree
  })

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          // Email content is single-paragraph by nature for the leaf types
          // we support. Heading + lists would be lost on the way to a
          // plain string anyway — disable them so the user can't create
          // structure that won't round-trip.
          heading: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
        }),
      ],
      content: target?.node.content ?? '',
      onUpdate: ({ editor }) => {
        const t = targetRef.current
        const tree = parsedJsonRef.current
        if (!t || !tree) return
        // TipTap stores rich doc state internally. For this spike we
        // serialize to plain text so mc-text/mc-button/mc-preview content
        // (which is a `string`) round-trips losslessly. Inline marks (bold,
        // italic, link, mc-variable chip) become a Phase-2 followup with a
        // proper TipTap → HTML/marker serializer.
        const next = safeGetText(editor)
        if (next === null) return
        const newTree = replaceContentAtPath(tree, t.path, next)
        setSourceFromTreeRef.current(newTree)
      },
    },
    // ONLY recreate when the selected source node changes. Including content
    // here means every keystroke tears down + rebuilds the editor, and the
    // sync effect below ends up calling getText() while the new editor's
    // schema is still null → `Cannot read properties of null (reading 'nodes')`.
    [target?.entry.id],
  )

  // Belt-and-suspenders: if the upstream source mutates while the editor is
  // mounted (e.g. user pasted into the JSON source pane, switched template,
  // or another tab modified the tree) re-seed the doc. The same-content
  // check makes the post-keystroke recompile a no-op.
  useEffect(() => {
    if (!editor || editor.isDestroyed || !target) return
    const current = safeGetText(editor)
    if (current === null) return // schema mid-swap, retry on next render
    if (current !== target.node.content) {
      editor.commands.setContent(target.node.content ?? '', { emitUpdate: false })
    }
  }, [editor, target?.node.content, target])

  /* ── Empty / instruction states ─────────────────────────────────────── */

  if (!selectedEntryId) {
    return (
      <EmptyState
        title="Click a text node in the preview"
        body="Use the Inspect tool on the preview and click any text, button, or title to open it here for editing."
      />
    )
  }

  if (!target) {
    const entry = sourceMap?.entries.find((e) => e.id === selectedEntryId)
    const sourceComponent = entry?.sourceComponent ?? '—'
    return (
      <EmptyState
        title="Selection is not editable"
        body={`'${sourceComponent}' doesn't have a string content field. Pick a 'mc-text', 'mc-button', 'mc-title', or 'mc-preview' node to edit its text inline.`}
      />
    )
  }

  /* ── Editor surface ─────────────────────────────────────────────────── */

  return (
    <div className="h-full flex flex-col overflow-hidden bg-card">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card shrink-0">
        <Edit3 className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] font-mono text-foreground">
          {target.node.type}
        </span>
        <span className="text-[10px] text-muted-foreground/60">
          line {target.entry.sourceLoc.startLine}
        </span>
        <span className="ml-auto text-[10px] text-emerald-500/80 font-medium">
          ● live
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <EditorContent
          editor={editor}
          className="tiptap-mc text-[13px] leading-relaxed text-foreground focus-within:outline-none"
        />
      </div>

      <div className="px-3 py-2 border-t border-border bg-card/40 shrink-0 text-[10px] text-muted-foreground/70">
        Edits write back to the JSON source and recompile on every keystroke.
        `{`{`}variable{`}`}` syntax is preserved as plain text.
      </div>
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6 py-8 bg-card">
      <Edit3 className="h-6 w-6 text-muted-foreground/30" />
      <p className="text-[12px] font-medium text-foreground/80">{title}</p>
      <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-[280px]">
        {body}
      </p>
    </div>
  )
}
