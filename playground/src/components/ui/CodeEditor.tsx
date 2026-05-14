/**
 * CodeEditor — reusable theme-aware CodeMirror editor.
 *
 * Wraps @uiw/react-codemirror with:
 *   - Language support: 'xml' (mailc .mc markup) or 'html' (compiled output)
 *   - Theme switching tied to useThemeStore (dark / light)
 *   - Optional read-only mode with line-click callback
 *   - Optional line-range highlight + auto-scroll for source-map panels
 *   - Optional onKeyDown hook for ⌘Enter / Esc shortcuts in edit mode
 */
import { useMemo, useEffect, useRef } from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { xml } from '@codemirror/lang-xml'
import { html } from '@codemirror/lang-html'
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view'
import { StateField, StateEffect, type Range } from '@codemirror/state'
import { useThemeStore } from '@/lib/theme'
import { darkCmTheme, lightCmTheme } from '@/lib/cm-theme'

// ---------------------------------------------------------------------------
// Line highlight decoration (used by source-map panels)
// ---------------------------------------------------------------------------

const highlightLineEffect = StateEffect.define<{ start: number; end: number } | null>()

const highlightLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(deco, tr) {
    deco = deco.map(tr.changes)
    for (const effect of tr.effects) {
      if (effect.is(highlightLineEffect)) {
        if (!effect.value) return Decoration.none
        const { start, end } = effect.value
        const marks: Range<Decoration>[] = []
        for (let ln = start; ln <= end; ln++) {
          if (ln > tr.state.doc.lines) break
          marks.push(
            Decoration.line({ class: 'cm-source-highlight' }).range(
              tr.state.doc.line(ln).from,
            ),
          )
        }
        return marks.length > 0 ? Decoration.set(marks) : Decoration.none
      }
    }
    return deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CodeEditorProps {
  /** Source text to display / edit. */
  value: string
  /** Language for syntax highlighting. */
  language: 'xml' | 'html' | 'json'
  /**
   * Called whenever the value changes (edit mode).
   * When absent the editor is treated as read-only.
   */
  onChange?: (value: string) => void
  /** Force read-only even if onChange is provided. */
  readOnly?: boolean
  /**
   * Called with the 1-based line number when the user clicks inside the editor.
   * Useful for the source-map panels' line → entry lookup.
   */
  onLineClick?: (lineNum: number) => void
  /**
   * 1-based inclusive line range to highlight as a source-map selection.
   * The editor auto-scrolls to the start line when this changes.
   */
  highlightLines?: { start: number; end: number } | null
  /**
   * Optional incrementing token used to retrigger highlight/scroll when the
   * same line is selected repeatedly.
   */
  highlightTrigger?: number
  /**
   * Low-level keydown hook — use for ⌘Enter / Esc shortcuts.
   * Called before CodeMirror's own keymap handling.
   */
  onKeyDown?: (e: KeyboardEvent) => void
  /**
   * When set, scrolls to and highlights this single line without changing
   * selectedEntryId. Designed for console loc-clicks. Token must increment
   * on each call so the effect fires even when the line is the same.
   */
  jumpLine?: { line: number; token: number } | null
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Theme-aware CodeMirror editor for mailc markup and HTML output.
 *
 * Use `onLineClick` + `highlightLines` for source-map interactivity.
 * Use `onKeyDown` to hook ⌘Enter / Esc in the edit panel.
 */
export function CodeEditor({
  value,
  language,
  onChange,
  readOnly = false,
  onLineClick,
  highlightLines,
  highlightTrigger,
  onKeyDown,
  jumpLine,
  className,
}: CodeEditorProps) {
  const appTheme = useThemeStore((s) => s.theme)
  const cmRef = useRef<ReactCodeMirrorRef>(null)

  // Dispatch highlight + scroll whenever the highlighted range changes.
  useEffect(() => {
    const view = cmRef.current?.view
    if (!view) return
    view.dispatch({ effects: highlightLineEffect.of(highlightLines ?? null) })
    if (highlightLines) {
      const lineNum = Math.min(highlightLines.start, view.state.doc.lines)
      const pos = view.state.doc.line(lineNum).from
      view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: 'center' }) })
    }
  }, [highlightLines, highlightTrigger])

  // Scroll + highlight a single line on console loc-click without selecting an entry.
  useEffect(() => {
    if (!jumpLine) return
    const view = cmRef.current?.view
    if (!view) return
    const lineNum = Math.min(jumpLine.line, view.state.doc.lines)
    view.dispatch({
      effects: [
        highlightLineEffect.of({ start: lineNum, end: lineNum }),
        EditorView.scrollIntoView(view.state.doc.line(lineNum).from, { y: 'center' }),
      ],
    })
  }, [jumpLine])

  const langExtension = useMemo(
    () => (language === 'html' ? html() : xml()),
    [language],
  )

  const clickExtension = useMemo(() => {
    if (!onLineClick) return []
    return EditorView.domEventHandlers({
      click(event, view) {
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (pos != null) {
          onLineClick(view.state.doc.lineAt(pos).number)
        }
        return false
      },
    })
  }, [onLineClick])

  const keydownExtension = useMemo(() => {
    if (!onKeyDown) return []
    return EditorView.domEventHandlers({
      keydown(event) {
        onKeyDown(event)
        return false
      },
    })
  }, [onKeyDown])

  const isReadOnly = readOnly || !onChange

  // In read-only view mode: hide the blinking text cursor and show pointer so
  // users know they can click lines for source-map navigation.
  const readOnlyUxExtension = useMemo(() => {
    if (!isReadOnly) return []
    return EditorView.theme({
      '.cm-cursor, .cm-dropCursor': { display: 'none !important' },
      '.cm-content': { cursor: 'pointer' },
      '.cm-line': { cursor: 'pointer' },
    })
  }, [isReadOnly])

  const extensions = useMemo(
    () => [langExtension, EditorView.lineWrapping, highlightLineField, clickExtension, keydownExtension, readOnlyUxExtension],
    [langExtension, clickExtension, keydownExtension, readOnlyUxExtension],
  )

  return (
    <CodeMirror
      ref={cmRef}
      value={value}
      onChange={isReadOnly ? undefined : onChange}
      readOnly={isReadOnly}
      theme={appTheme === 'dark' ? darkCmTheme : lightCmTheme}
      extensions={extensions}
      height="100%"
      // The ReactCodeMirror wrapper div itself needs height:100% so that
      // the inner .cm-editor { height:100% } resolves against the container,
      // not against an auto-height parent (which collapses to 0).
      style={{ height: '100%' }}
      className={className}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        dropCursor: false,
        allowMultipleSelections: false,
        indentOnInput: !isReadOnly,
        bracketMatching: true,
        closeBrackets: !isReadOnly,
        autocompletion: false,
        highlightActiveLine: !isReadOnly,
        highlightActiveLineGutter: !isReadOnly,
        syntaxHighlighting: true,
        searchKeymap: false,
        tabSize: 2,
      }}
    />
  )
}
