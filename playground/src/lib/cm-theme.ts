/**
 * CodeMirror theme extensions for the mailc playground.
 *
 * Both themes are hand-tuned to blend with the app's zinc palette rather
 * than importing a third-party theme that brings its own background colours.
 *
 * Dark  → zinc-950 bg, muted gutters, GitHub-Dark-style syntax palette.
 * Light → zinc-50 bg, soft gutters, GitHub-Light-style syntax palette.
 *
 * Both define `.cm-source-highlight` for the source-map line selection.
 */
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import type { Extension } from '@codemirror/state'

// ---------------------------------------------------------------------------
// Shared highlight decoration (source-map selection stripe)
// ---------------------------------------------------------------------------

const sourceHighlight = {
  '.cm-source-highlight': {
    backgroundColor: 'rgba(139,92,246,0.12) !important',
    borderLeft: '2px solid #8b5cf6',
  },
}

// ---------------------------------------------------------------------------
// Dark theme  (GitHub Dark Dimmed palette — calm on zinc-950)
// ---------------------------------------------------------------------------

/** Tag colours inspired by GitHub Dark Dimmed — soft, low-chroma. */
const darkSyntax = HighlightStyle.define([
  // Comments — muted zinc
  { tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment],
    color: '#768390', fontStyle: 'italic' },
  // Markup tags  <mc-section>  <div>
  { tag: tags.tagName, color: '#a78bfa' },              // violet (accent-soft)
  { tag: tags.angleBracket, color: '#8b5cf6' },          // accent purple
  { tag: tags.attributeName, color: '#5ce0b3' },         // mint
  { tag: tags.attributeValue, color: '#ff9d6e' },        // peach
  { tag: [tags.string, tags.special(tags.string)], color: '#ff9d6e' },
  // Numbers, booleans, null
  { tag: [tags.number, tags.integer, tags.float], color: '#f2cc60' },
  { tag: [tags.bool, tags.null], color: '#ff7b72' },
  // Keywords / control
  { tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword], color: '#ff7b72' },
  // Operators, punctuation
  { tag: [tags.operator, tags.punctuation], color: '#8b949e' },
  // Variables / identifiers
  { tag: tags.variableName, color: '#e6edf3' },
  { tag: tags.definition(tags.variableName), color: '#ffa657', fontWeight: '600' },
  { tag: tags.propertyName, color: '#79c0ff' },
  // Types / namespaces
  { tag: [tags.typeName, tags.className], color: '#ffa657' },
  { tag: tags.namespace, color: '#ffa657' },
  // Misc
  { tag: tags.meta, color: '#8b949e' },
  { tag: tags.processingInstruction, color: '#8b949e' },
  { tag: tags.self, color: '#ff7b72' },
  { tag: tags.character, color: '#a5d6ff' },
])

const darkBase = EditorView.theme(
  {
    // Root — matches app card bg exactly
    '&': {
      height: '100%',
      backgroundColor: 'var(--card-bg)',
      color: '#e6edf3',
      fontSize: '12px',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
    },
    '.cm-scroller': {
      overflowY: 'auto',
      overflowX: 'hidden',
      lineHeight: '1.6',
    },
    // Gutter
    '.cm-gutters': {
      backgroundColor: 'var(--card-bg)',
      borderRight: '1px solid var(--border-color)',
      color: '#484f58',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      minWidth: '2.75rem',
      paddingRight: '0.75rem',
    },
    // Lines
    '.cm-line': { paddingLeft: '0.75rem' },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.04)' },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.04)', color: '#8b949e' },
    // Selection
    '.cm-selectionBackground': { backgroundColor: 'rgba(121,192,255,0.15) !important' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(121,192,255,0.2) !important' },
    '.cm-cursor': { borderLeftColor: '#e6edf3', borderLeftWidth: '2px' },
    // Matching bracket
    '.cm-matchingBracket': {
      backgroundColor: 'rgba(121,192,255,0.15)',
      outline: '1px solid rgba(121,192,255,0.4)',
    },
    // Source-map highlight stripe
    ...sourceHighlight,
  },
  { dark: true },
)

/** Dark theme: custom GitHub-Dark-Dimmed syntax + zinc-950 app backgrounds. */
export const darkCmTheme: Extension = [darkBase, syntaxHighlighting(darkSyntax)]

// ---------------------------------------------------------------------------
// Light theme  (GitHub Light palette — readable on zinc-50)
// ---------------------------------------------------------------------------

const lightSyntax = HighlightStyle.define([
  // Comments
  { tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment],
    color: '#6e7781', fontStyle: 'italic' },
  // Markup tags
  { tag: tags.tagName, color: '#6d28d9' },               // deep violet
  { tag: tags.angleBracket, color: '#7c3aed' },          // violet
  { tag: tags.attributeName, color: '#0d7e6e' },         // dark teal (mint for light)
  { tag: tags.attributeValue, color: '#c2410c' },        // dark orange (peach for light)
  { tag: [tags.string, tags.special(tags.string)], color: '#c2410c' },
  // Numbers / booleans
  { tag: [tags.number, tags.integer, tags.float], color: '#953800' },
  { tag: [tags.bool, tags.null], color: '#0550ae' },
  // Keywords
  { tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword], color: '#cf222e' },
  // Operators, punctuation
  { tag: [tags.operator, tags.punctuation], color: '#8c959f' },
  // Variables / identifiers
  { tag: tags.variableName, color: '#24292f' },
  { tag: tags.definition(tags.variableName), color: '#953800', fontWeight: '600' },
  { tag: tags.propertyName, color: '#0550ae' },
  // Types
  { tag: [tags.typeName, tags.className], color: '#953800' },
  { tag: tags.namespace, color: '#953800' },
  // Misc
  { tag: tags.meta, color: '#6e7781' },
  { tag: tags.processingInstruction, color: '#6e7781' },
  { tag: tags.self, color: '#cf222e' },
  { tag: tags.character, color: '#0a3069' },
])

const lightBase = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: 'var(--card-bg)',
      color: '#24292f',
      fontSize: '12px',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
    },
    '.cm-scroller': {
      overflowY: 'auto',
      overflowX: 'hidden',
      lineHeight: '1.6',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--card-bg)',
      borderRight: '1px solid var(--border-color)',
      color: '#8c959f',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      minWidth: '2.75rem',
      paddingRight: '0.75rem',
    },
    '.cm-line': { paddingLeft: '0.75rem' },
    '.cm-activeLine': { backgroundColor: 'rgba(0,0,0,0.03)' },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(0,0,0,0.03)', color: '#57606a' },
    '.cm-selectionBackground': { backgroundColor: 'rgba(5,80,174,0.1) !important' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(5,80,174,0.15) !important' },
    '.cm-cursor': { borderLeftColor: '#24292f', borderLeftWidth: '2px' },
    '.cm-matchingBracket': {
      backgroundColor: 'rgba(5,80,174,0.1)',
      outline: '1px solid rgba(5,80,174,0.3)',
    },
    '.cm-content': { caretColor: '#24292f' },
    ...sourceHighlight,
  },
  { dark: false },
)

/** Light theme: GitHub Light syntax + zinc-50 app backgrounds. */
export const lightCmTheme: Extension = [lightBase, syntaxHighlighting(lightSyntax)]
