/**
 * Themed code block with syntax highlighting.
 *
 * Reusable across the playground for displaying mailc markup, HTML, JSON,
 * TypeScript, etc. Auto-switches between light and dark Prism themes based
 * on the user's selected theme.
 *
 * Usage:
 *   <CodeBlock language="markup" code={source} />
 *   <CodeBlock language="json" code={json} maxHeight={400} />
 *
 * mailc markup uses the "markup" language (Prism's name for HTML/XML).
 */

import { Highlight, type Language, type PrismTheme } from 'prism-react-renderer'
import { useEffect, useMemo, useRef } from 'react'
import { html as beautifyHtml } from 'js-beautify'
import { useThemeStore } from '@/lib/theme'
import { cn } from '@/lib/utils'

// ── Email-safe HTML formatter options ─────────────────────────────────────
// Same shape as the compiler's prettifier (src/utils/formatter.ts) so anything
// rendered through CodeBlock for `markup` / `html` languages comes out the same
// way the compiler would produce a pretty-printed result.
const HTML_BEAUTIFY_OPTIONS = {
  indent_size: 2,
  indent_char: ' ',
  max_preserve_newlines: 1,
  preserve_newlines: true,
  wrap_line_length: 0,
  end_with_newline: false,
  inline: [] as string[],
  extra_liners: [] as string[],
  content_unformatted: ['script', 'style'] as string[],
}

/**
 * Pretty-print HTML / mailc markup if it looks single-line. Single-line input
 * is the dead giveaway that the source was minified or generated; multi-line
 * input is left alone so authors who hand-formatted their code don't get it
 * "fixed" against their intent. Falls back to the raw input on any error.
 *
 * For mailc `<mc-*>` markup we use a custom indenter — js-beautify treats
 * unknown custom tags as inline and refuses to break them onto separate lines.
 */
function maybePrettifyMarkup(code: string): string {
  if (!code) return code
  // Already multi-line — assume the author intended this layout.
  if (code.includes('\n')) return code
  // Doesn't look like HTML/XML tags — nothing to do.
  if (!/<[a-zA-Z]/.test(code)) return code
  // mailc markup → custom formatter (js-beautify can't handle custom tags).
  if (/<mc[->]/.test(code)) {
    try {
      return formatMcMarkup(code)
    } catch {
      return code
    }
  }
  try {
    return beautifyHtml(code, HTML_BEAUTIFY_OPTIONS)
  } catch {
    return code
  }
}

// ── Custom mailc-aware indenter ───────────────────────────────────────────
// js-beautify's HTML mode whitelists known inline tags and treats everything
// else as block — but the inverse: it doesn't know mailc's `<mc-*>` tags so
// it preserves them on a single line. Roll our own.

type McToken =
  | { kind: 'open'; tag: string; raw: string }
  | { kind: 'close'; tag: string; raw: string }
  | { kind: 'self'; tag: string; raw: string }
  | { kind: 'text'; raw: string }
  | { kind: 'comment'; raw: string }
  | { kind: 'doctype'; raw: string }

function tokenizeMcMarkup(src: string): McToken[] {
  const tokens: McToken[] = []
  // Order matters: comments / doctype first; self-closing before open.
  const re = /<!--[\s\S]*?-->|<!\w[^>]*>|<\/([\w-]+)\s*>|<([\w-]+)([^>]*?)\/>|<([\w-]+)([^>]*?)>|([^<]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    const raw = m[0]
    if (raw.startsWith('<!--')) tokens.push({ kind: 'comment', raw })
    else if (raw.startsWith('<!')) tokens.push({ kind: 'doctype', raw })
    else if (m[1]) tokens.push({ kind: 'close', tag: m[1], raw })
    else if (m[2]) tokens.push({ kind: 'self', tag: m[2], raw })
    else if (m[4]) tokens.push({ kind: 'open', tag: m[4], raw })
    else if (m[6]) {
      const trimmed = m[6].replace(/\s+/g, ' ').trim()
      if (trimmed) tokens.push({ kind: 'text', raw: trimmed })
    }
  }
  return tokens
}

export function formatMcMarkup(src: string, indentUnit = '  '): string {
  const tokens = tokenizeMcMarkup(src)
  const lines: string[] = []
  let depth = 0
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const next = tokens[i + 1]
    const next2 = tokens[i + 2]
    if (t.kind === 'open') {
      // Inline form `<tag>text</tag>` — keep on one line.
      if (next?.kind === 'text' && next2?.kind === 'close' && next2.tag === t.tag) {
        lines.push(indentUnit.repeat(depth) + t.raw + next.raw + next2.raw)
        i += 2
      } else if (next?.kind === 'close' && next.tag === t.tag) {
        // Empty `<tag></tag>` — keep on one line.
        lines.push(indentUnit.repeat(depth) + t.raw + next.raw)
        i += 1
      } else {
        lines.push(indentUnit.repeat(depth) + t.raw)
        depth++
      }
    } else if (t.kind === 'close') {
      depth = Math.max(0, depth - 1)
      lines.push(indentUnit.repeat(depth) + t.raw)
    } else if (t.kind === 'self') {
      lines.push(indentUnit.repeat(depth) + t.raw)
    } else if (t.kind === 'text') {
      lines.push(indentUnit.repeat(depth) + t.raw)
    } else if (t.kind === 'comment' || t.kind === 'doctype') {
      lines.push(indentUnit.repeat(depth) + t.raw)
    }
  }
  return lines.join('\n')
}

/**
 * Locate the line range of the deepest occurrence of a tag in formatted markup.
 * Used to highlight the "selected" component in the source view.
 *
 * Bottom-up scan favours the innermost / most-nested occurrence — useful when
 * the same tag appears in `mc-attributes` defaults *and* in the body.
 */
export function findTagLineRange(
  formattedCode: string,
  tag: string,
): { start: number; end: number } | null {
  if (!tag) return null
  const lines = formattedCode.split('\n')
  const openRe = new RegExp(`^\\s*<${escapeRegExp(tag)}(?:\\s|>|/>)`)
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!openRe.test(lines[i])) continue
    const trimmed = lines[i].trim()
    // Self-closing or inline (open + close on same line) → single line range.
    if (trimmed.endsWith('/>') || trimmed.includes(`</${tag}>`)) {
      return { start: i, end: i }
    }
    // Multi-line: find matching close at the same indentation.
    const indent = lines[i].length - lines[i].trimStart().length
    const closeRe = new RegExp(`^\\s*</${escapeRegExp(tag)}>\\s*$`)
    for (let j = i + 1; j < lines.length; j++) {
      const indentJ = lines[j].length - lines[j].trimStart().length
      if (indentJ === indent && closeRe.test(lines[j])) {
        return { start: i, end: j }
      }
    }
    return { start: i, end: i }
  }
  return null
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ── Custom Prism themes — same palette as CodeMirror + SyntaxLine ──────────
const mailcDark: PrismTheme = {
  plain: { color: '#e6edf3', backgroundColor: 'transparent' },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: '#768390', fontStyle: 'italic' } },
    { types: ['tag'], style: { color: '#8b5cf6' } },
    { types: ['attr-name', 'property'], style: { color: '#5ce0b3' } },
    { types: ['attr-value', 'string', 'char'], style: { color: '#ff9d6e' } },
    { types: ['punctuation'], style: { color: '#8b5cf6' } },
    { types: ['operator'], style: { color: '#a78bfa' } },
    { types: ['number', 'unit'], style: { color: '#f2cc60' } },
    { types: ['keyword', 'boolean', 'null', 'undefined'], style: { color: '#ff7b72' } },
    { types: ['function', 'class-name'], style: { color: '#79c0ff' } },
    { types: ['variable'], style: { color: '#e6edf3' } },
    { types: ['selector', 'important', 'atrule'], style: { color: '#a78bfa' } },
    { types: ['inserted'], style: { color: '#3fb950' } },
    { types: ['deleted'], style: { color: '#ff7b72' } },
  ],
}

const mailcLight: PrismTheme = {
  plain: { color: '#24292f', backgroundColor: 'transparent' },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: '#6e7781', fontStyle: 'italic' } },
    { types: ['tag'], style: { color: '#6d28d9' } },
    { types: ['attr-name', 'property'], style: { color: '#0d7e6e' } },
    { types: ['attr-value', 'string', 'char'], style: { color: '#c2410c' } },
    { types: ['punctuation'], style: { color: '#6d28d9' } },
    { types: ['operator'], style: { color: '#7c3aed' } },
    { types: ['number', 'unit'], style: { color: '#953800' } },
    { types: ['keyword', 'boolean', 'null', 'undefined'], style: { color: '#cf222e' } },
    { types: ['function', 'class-name'], style: { color: '#0550ae' } },
    { types: ['variable'], style: { color: '#24292f' } },
    { types: ['selector', 'important', 'atrule'], style: { color: '#7c3aed' } },
    { types: ['inserted'], style: { color: '#116329' } },
    { types: ['deleted'], style: { color: '#cf222e' } },
  ],
}

interface CodeBlockProps {
  /** The code to highlight. */
  code: string
  /**
   * Prism language identifier. Use `'markup'` for HTML and mailc `.mc` markup
   * (since mailc is XML-shaped). Use `'json'`, `'typescript'`, `'tsx'`,
   * `'css'`, `'bash'` etc. for other content.
   */
  language?: Language
  /** Optional max height in px. Adds vertical scroll when exceeded. */
  maxHeight?: number
  /** Show line numbers in a left gutter. */
  showLineNumbers?: boolean
  /** Extra class names on the outer `<pre>`. */
  className?: string
  /**
   * Inclusive line range (0-indexed, post-prettify) to visually highlight.
   * Lines in range get a soft accent background — useful for pointing the
   * reader at the "selected" tag in a larger source/output sample.
   */
  highlightLines?: { start: number; end: number } | null
  /**
   * If set, scroll the highlighted range into view when it changes.
   * Defaults to true when `highlightLines` is provided.
   */
  scrollHighlightIntoView?: boolean
}

export function CodeBlock({
  code,
  language = 'markup',
  maxHeight,
  showLineNumbers = false,
  className,
  highlightLines,
  scrollHighlightIntoView,
}: CodeBlockProps): JSX.Element {
  const theme = useThemeStore((s) => s.theme)
  const prismTheme = theme === 'dark' ? mailcDark : mailcLight
  const isDark = theme === 'dark'

  // Auto-prettify single-line HTML / mailc markup so output is readable.
  // Other languages pass through unchanged.
  const rendered = useMemo(() => {
    const trimmed = code.trimEnd()
    if (language === 'markup' || language === 'html') {
      return maybePrettifyMarkup(trimmed)
    }
    return trimmed
  }, [code, language])

  const preRef = useRef<HTMLPreElement | null>(null)
  const shouldScroll = scrollHighlightIntoView ?? Boolean(highlightLines)

  // Scroll the highlighted range into view when it changes.
  useEffect(() => {
    if (!shouldScroll || !highlightLines || !preRef.current) return
    const el = preRef.current.querySelector<HTMLDivElement>(
      `[data-line-index="${highlightLines.start}"]`,
    )
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [highlightLines, shouldScroll])

  const highlightBg = isDark ? 'rgba(139, 92, 246, 0.16)' : 'rgba(139, 92, 246, 0.12)'
  const highlightBorder = isDark ? '#a78bfa' : '#7c3aed'

  return (
    <Highlight
      code={rendered}
      language={language}
      theme={prismTheme}
    >
      {({ className: c, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          ref={preRef}
          className={cn(
            'text-[12px] leading-[1.55] font-mono overflow-auto rounded-md border border-border',
            c,
            className,
          )}
          style={{
            ...style,
            margin: 0,
            padding: '12px 0',
            maxHeight: maxHeight ? `${maxHeight}px` : undefined,
          }}
        >
          {tokens.map((line, i) => {
            const { key: _lineKey, ...lineProps } = getLineProps({ line })
            const isHighlighted =
              !!highlightLines && i >= highlightLines.start && i <= highlightLines.end
            const isHighlightStart = !!highlightLines && i === highlightLines.start
            return (
              <div
                key={i}
                {...lineProps}
                data-line-index={i}
                style={{
                  display: 'flex',
                  paddingLeft: '14px',
                  paddingRight: '14px',
                  background: isHighlighted ? highlightBg : undefined,
                  borderLeft: isHighlighted
                    ? `2px solid ${highlightBorder}`
                    : '2px solid transparent',
                  marginLeft: '-2px',
                  position: 'relative',
                }}
              >
                {showLineNumbers && (
                  <span
                    aria-hidden
                    style={{
                      flexShrink: 0,
                      width: '2.5em',
                      textAlign: 'right',
                      paddingRight: '12px',
                      opacity: 0.4,
                      userSelect: 'none',
                    }}
                  >
                    {i + 1}
                  </span>
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  {line.map((token, j) => {
                    const { key: _tokenKey, ...tokenProps } = getTokenProps({ token })
                    return <span key={j} {...tokenProps} />
                  })}
                </span>
                {isHighlightStart && highlightLines && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: 0,
                      fontSize: '9px',
                      lineHeight: '1.55',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: highlightBorder,
                      opacity: 0.85,
                      pointerEvents: 'none',
                    }}
                  >
                    selected
                  </span>
                )}
              </div>
            )
          })}
        </pre>
      )}
    </Highlight>
  )
}
