'use client'

import { useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  MarkerType,
  type NodeProps,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// ---------------------------------------------------------------------------
// Detect Fumadocs theme (reads class="dark" on <html>, not OS preference)
// ---------------------------------------------------------------------------

function useFumadocsDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const update = () => setDark(document.documentElement.classList.contains('dark'))
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

// ---------------------------------------------------------------------------
// Scoped CSS — canvas bg + controls skin per theme
// ---------------------------------------------------------------------------

const STYLES = `
  .mailc-rf {
    --n-bg:     #ffffff;
    --n-border: #e2e8f0;
    --n-head:   #f8fafc;
    --n-text:   #0f172a;
    --n-sub:    #64748b;
    --n-mono:   #94a3b8;
    --c-bg:     #f9fafb;
    --c-dots:   #c8d0da;
    --io-bg:    #f1f5f9;
    --io-brd:   #94a3b8;
    --io-txt:   #475569;
    --out-bg:   #f0fdf4;
    --out-brd:  #22c55e;
    --out-txt:  #15803d;
  }
  .dark .mailc-rf {
    --n-bg:     #111111;
    --n-border: #2a2a2a;
    --n-head:   #0a0a0a;
    --n-text:   #f1f5f9;
    --n-sub:    #94a3b8;
    --n-mono:   #3f3f3f;
    --c-bg:     #000000;
    --c-dots:   #252525;
    --io-bg:    #1a1a1a;
    --io-brd:   #3f3f3f;
    --io-txt:   #94a3b8;
    --out-bg:   #0a1f0e;
    --out-brd:  #16a34a;
    --out-txt:  #4ade80;
  }
  /* React Flow canvas background */
  .mailc-rf .react-flow__renderer,
  .mailc-rf .react-flow__pane,
  .mailc-rf .react-flow {
    background: var(--c-bg) !important;
  }
  /* Controls */
  .mailc-rf .react-flow__controls {
    background: var(--n-bg);
    border: 1px solid var(--n-border);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,.1);
  }
  .mailc-rf .react-flow__controls-button {
    background: var(--n-bg);
    border-bottom: 1px solid var(--n-border);
    fill: var(--n-sub);
  }
  .mailc-rf .react-flow__controls-button:hover { background: var(--n-head); }
  .mailc-rf .react-flow__controls-button:last-child { border-bottom: none; }
  /* Edge labels */
  .mailc-rf .react-flow__edge-label-renderer .mailc-lbl {
    background: var(--n-bg);
    border: 1px solid var(--n-border);
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    color: var(--n-sub);
    padding: 2px 6px;
    pointer-events: none;
  }
`

// ---------------------------------------------------------------------------
// Accent palette (accent colour only — node chrome is via CSS vars)
// ---------------------------------------------------------------------------

const A: Record<string, { color: string; bg: string; fg: string }> = {
  red:    { color: '#f87171', bg: '#fee2e2', fg: '#b91c1c' },
  yellow: { color: '#f59e0b', bg: '#fef3c7', fg: '#92400e' },
  blue:   { color: '#60a5fa', bg: '#dbeafe', fg: '#1d4ed8' },
  purple: { color: '#a78bfa', bg: '#ede9fe', fg: '#5b21b6' },
  teal:   { color: '#2dd4bf', bg: '#ccfbf1', fg: '#0f766e' },
  gray:   { color: '#94a3b8', bg: '#f1f5f9', fg: '#475569' },
}

// ---------------------------------------------------------------------------
// Node components
// ---------------------------------------------------------------------------

interface PhaseData extends Record<string, unknown> {
  label: string
  sub?: string
  module?: string
  badge?: string
  accent?: keyof typeof A
}

function PhaseNode({ data }: NodeProps<Node<PhaseData>>) {
  const a = A[data.accent ?? 'gray']

  return (
    <div
      style={{
        width: 264,
        borderRadius: 12,
        border: '1px solid var(--n-border)',
        // Top accent line via inset box-shadow — preserves full border-radius
        boxShadow: `inset 0 3px 0 0 ${a.color}, 0 1px 6px rgba(0,0,0,.07)`,
        background: 'var(--n-bg)',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: a.color, width: 10, height: 10, border: '2px solid var(--n-bg)', top: -5 }}
      />

      {/* Card body */}
      <div style={{ padding: '12px 14px 10px' }}>
        {/* Title + badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: 'var(--n-text)', lineHeight: 1.3 }}>
            {data.label}
          </span>
          {data.badge && (
            <span style={{
              flexShrink: 0,
              marginTop: 1,
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: a.bg,
              color: a.fg,
              borderRadius: 5,
              padding: '2px 6px',
            }}>
              {data.badge}
            </span>
          )}
        </div>

        {data.sub && (
          <p style={{ margin: 0, fontSize: 11, color: 'var(--n-sub)', lineHeight: 1.5 }}>
            {data.sub}
          </p>
        )}

        {data.module && (
          <p style={{
            margin: '7px 0 0',
            fontSize: 10,
            fontFamily: 'ui-monospace, monospace',
            color: 'var(--n-mono)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {data.module}
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: a.color, width: 10, height: 10, border: '2px solid var(--n-bg)', bottom: -5 }}
      />
    </div>
  )
}

function IONode({ data }: NodeProps<Node<PhaseData>>) {
  const out = data.label === 'CompileResult'
  return (
    <div style={{
      background: out ? 'var(--out-bg)' : 'var(--io-bg)',
      border: `1.5px solid ${out ? 'var(--out-brd)' : 'var(--io-brd)'}`,
      borderRadius: 9999,
      padding: '9px 22px',
      fontSize: 13,
      fontWeight: 700,
      color: out ? 'var(--out-txt)' : 'var(--io-txt)',
      whiteSpace: 'nowrap',
      boxShadow: '0 1px 4px rgba(0,0,0,.06)',
      fontFamily: 'inherit',
    }}>
      <Handle type="target" position={Position.Top}
        style={{ background: out ? '#22c55e' : '#94a3b8', border: 'none', width: 8, height: 8 }} />
      {data.label}
      <Handle type="source" position={Position.Bottom}
        style={{ background: out ? '#22c55e' : '#94a3b8', border: 'none', width: 8, height: 8 }} />
    </div>
  )
}

function SectionLabel({ data }: NodeProps<Node<PhaseData>>) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: 'var(--n-mono)',
      pointerEvents: 'none', userSelect: 'none', fontFamily: 'inherit',
    }}>
      {data.label}
    </div>
  )
}

const nodeTypes = { phase: PhaseNode, io: IONode, label: SectionLabel }

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const MX = 180, ROW = 164
const PP_Y = ROW * 7 + 40, PP_ROW = 152
const PL = 38, PR = PL + 318
const CX = MX + 448

const nodes: Node<PhaseData>[] = [
  { id: 'input', type: 'io', position: { x: MX + 28, y: 0 },
    data: { label: 'source / options' } },

  { id: 's1', type: 'phase', position: { x: MX, y: ROW },
    data: { label: 'Stage 1 · Tokenize', sub: 'Source string → flat token stream',
            module: 'tokenizer/index.ts', badge: 'Fatal', accent: 'red' } },

  { id: 's2', type: 'phase', position: { x: MX, y: ROW * 2 },
    data: { label: 'Stage 2 · Parse', sub: 'Token stream → AST',
            module: 'parser/index.ts', badge: 'Fatal', accent: 'red' } },

  { id: 'cls', type: 'phase', position: { x: CX, y: ROW * 2 },
    data: { label: 'CSS Classifier', badge: 'Parallel', accent: 'gray',
            sub: 'Probes caniemail → SAFE / ENHANCE / BREAKING / NO_EFFECT',
            module: 'css/classifier.ts' } },

  { id: 's3', type: 'phase', position: { x: MX, y: ROW * 3 },
    data: { label: 'Stage 3 · Validate', badge: 'Partial', accent: 'yellow',
            sub: 'AST structure, required parents and children, nesting rules',
            module: 'validator/index.ts' } },

  { id: 's3b', type: 'phase', position: { x: MX, y: ROW * 4 },
    data: { label: 'Stage 3b · Templates', badge: 'If data', accent: 'blue',
            sub: '{{ vars }}, mc-if / mc-else, mc-for-each loops',
            module: 'template/index.ts' } },

  { id: 's4', type: 'phase', position: { x: MX, y: ROW * 5 },
    data: { label: 'Stage 4 · Compile', badge: 'Core', accent: 'purple',
            sub: 'AST → raw HTML. Per component: resolve → classify → inline CSS',
            module: 'compiler/index.ts' } },

  { id: 's5', type: 'phase', position: { x: MX, y: ROW * 6 },
    data: { label: 'Stage 5 · Assemble', accent: 'teal',
            sub: 'Inject responsive <style> block + ENHANCE fallback rules',
            module: 'post-processor/assembler.ts' } },

  { id: 'pp_lbl', type: 'label', position: { x: PL, y: PP_Y - 26 },
    data: { label: 'Post-Processing' } },

  { id: 'pp_inline', type: 'phase', position: { x: PL, y: PP_Y },
    data: { label: 'Stage 5.5 · Inline Styles', accent: 'teal',
            sub: 'Apply mc-style inline="true" rules to elements',
            module: 'post-processor/inline-styles.ts' } },
  { id: 'pp_a11y', type: 'phase', position: { x: PL, y: PP_Y + PP_ROW },
    data: { label: 'Stage 5.6 · Accessibility', accent: 'teal',
            sub: 'alt text, role="presentation", lang propagation',
            module: 'post-processor/accessibility.ts' } },
  { id: 'pp_opt', type: 'phase', position: { x: PL, y: PP_Y + PP_ROW * 2 },
    data: { label: 'Stage 6 · Optimize', accent: 'teal',
            sub: 'Strip comments, collapse whitespace, minify',
            module: 'post-processor/optimizer.ts' } },

  { id: 'pp_dark', type: 'phase', position: { x: PR, y: PP_Y },
    data: { label: 'Stage 5.55 · Dark Mode', accent: 'teal',
            sub: 'Inject color-scheme meta + @media prefers-color-scheme',
            module: 'post-processor/dark-mode.ts' } },
  { id: 'pp_ctr', type: 'phase', position: { x: PR, y: PP_Y + PP_ROW },
    data: { label: 'Stage 5.7 · Contrast', accent: 'teal',
            sub: 'WCAG contrast-ratio warnings on color pairs',
            module: 'post-processor/contrast-checker.ts' } },
  { id: 'pp_bgt', type: 'phase', position: { x: PR, y: PP_Y + PP_ROW * 2 },
    data: { label: 'Stage 6.5 · Email Budget', accent: 'teal',
            sub: 'Gmail 102 KB clip-risk detection',
            module: 'compiler/email-budget.ts' } },

  { id: 'output', type: 'io', position: { x: MX + 28, y: PP_Y + PP_ROW * 3 + 20 },
    data: { label: 'CompileResult' } },
]

// ---------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------

const EDGE_COLOR = '#94a3b8'

const arrow = (s: string, t: string): Edge => ({
  id: `${s}→${t}`, source: s, target: t, type: 'smoothstep',
  style: { strokeWidth: 1.8, stroke: EDGE_COLOR },
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: EDGE_COLOR },
})

const dashed = (s: string, t: string, label?: string): Edge => ({
  id: `${s}⇢${t}`, source: s, target: t, type: 'smoothstep', animated: true,
  style: { strokeWidth: 1.5, stroke: EDGE_COLOR, strokeDasharray: '5 4' },
  ...(label ? {
    label,
    labelStyle: { fontSize: 0 }, // hidden — rendered via custom labelRenderer
    labelShowBg: false,
  } : {}),
  data: { edgeLabel: label },
  markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: EDGE_COLOR },
})

const edges: Edge[] = [
  arrow('input', 's1'), arrow('s1', 's2'), arrow('s2', 's3'),
  arrow('s3', 's3b'), arrow('s3b', 's4'), arrow('s4', 's5'),
  arrow('s5', 'pp_inline'), arrow('s5', 'pp_dark'),
  arrow('pp_inline', 'pp_a11y'), arrow('pp_a11y', 'pp_opt'),
  arrow('pp_dark', 'pp_ctr'), arrow('pp_ctr', 'pp_bgt'),
  arrow('pp_opt', 'output'), arrow('pp_bgt', 'output'),
  dashed('s2', 'cls'),
  dashed('cls', 's4', 'classificationMap'),
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CompilePhasesFlow() {
  const dark = useFumadocsDark()

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div
        className="mailc-rf not-prose"
        style={{
          height: 780,
          borderRadius: 14,
          border: '1px solid var(--n-border)',
          overflow: 'hidden',
          background: 'var(--c-bg)',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          colorMode={dark ? 'dark' : 'light'}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.18}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="var(--c-dots)"
          />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </>
  )
}
