/**
 * Generic landing for `/build`, `/style`, `/extend`.
 *
 * Each bucket renders a hero + grid of tool cards. The shape of the bucket
 * is defined here so the index pages stay simple wrappers.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Hammer,
  Palette,
  Plug,
  ArrowRight,
  ArrowLeft,
  // Build icons
  MousePointerClick,
  Code2,
  Braces,
  Sparkles,
  Beaker,
  Network,
  // Style icons
  Paintbrush,
  Type,
  ShieldCheck,
  Columns3,
  Moon,
  Accessibility,
  // Extend icons
  Store,
  Telescope,
  Bot,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolCard {
  path: string
  label: string
  description: string
  api?: string
  icon: typeof Code2
  badge?: string
}

interface Bucket {
  id: 'build' | 'style' | 'extend'
  icon: typeof Hammer
  title: string
  tagline: string
  body: string
  tools: ToolCard[]
  /** Secondary tools — reachable but not promoted to the primary grid. */
  secondary?: ToolCard[]
}

const BUCKETS: Record<'build' | 'style' | 'extend', Bucket> = {
  build: {
    id: 'build',
    icon: Hammer,
    title: 'Build',
    tagline: 'Author email content — visually, in markup, or as JSON IR.',
    body:
      "mailc gives you four ways to author the same email. The visual builder is for designers. The code playground is for engineers who want full control. The JSON playground exposes the same IR builders use under the hood. Templating adds variables and logic.",
    tools: [
      {
        path: '/build/visual',
        label: 'Visual Builder',
        description:
          'Drag-drop email composer. Component palette, live preview, attribute panel — no code required.',
        icon: MousePointerClick,
      },
      {
        path: '/build/code',
        label: 'Code Playground',
        description:
          'Markup editor with bidirectional source maps. Click the preview to jump to source, click source to highlight preview.',
        icon: Code2,
        badge: 'Power user',
      },
      {
        path: '/build/json',
        label: 'JSON Playground',
        description:
          'Same as Code Playground but with JSON IR as the input — the API builders use programmatically.',
        icon: Braces,
      },
      {
        path: '/build/templating',
        label: 'Templating',
        description:
          'Variables ({{user.name}}), conditionals (mc-if), loops (mc-each). Sandboxed engine — no eval, no Function.',
        icon: Sparkles,
      },
    ],
    secondary: [
      {
        path: '/build/visual-json',
        label: 'Visual JSON Builder',
        description: 'Drag-drop builder where the underlying state is JSON IR (vs markup).',
        icon: Network,
      },
      {
        path: '/build/sandbox',
        label: 'Quick Sandbox',
        description: 'Minimal markup → HTML sandbox. Compiles in a worker for instant feedback.',
        icon: Beaker,
      },
    ],
  },
  style: {
    id: 'style',
    icon: Palette,
    title: 'Style',
    tagline: 'Theme it, switch styling modes, check client compatibility.',
    body:
      "Two styling paradigms ship with mailc: attribute-based (HTML-like, default) and class-based (Tailwind utilities, limited support). Theme tokens drive the class system. The compatibility tool runs any CSS through caniemail's per-client database.",
    tools: [
      {
        path: '/style/theme',
        label: 'Theme & Tokens',
        description:
          'Edit color, spacing, font tokens. See your design system applied across emails. Best paired with class mode.',
        icon: Paintbrush,
      },
      {
        path: '/style/class',
        label: 'Class Mode',
        description:
          'Tailwind-style utilities (bg-brand, text-lg, p-4). Limited support — some props need attribute fallbacks.',
        icon: Type,
        badge: 'limited',
      },
      {
        path: '/style/modes',
        label: 'Modes Compared',
        description:
          'Side-by-side: same email composed in attribute mode and class mode. See the trade-offs explicit instead of guessing.',
        icon: Columns3,
      },
      {
        path: '/style/compatibility',
        label: 'Client Compatibility',
        description:
          'Paste any CSS, pick target clients, see per-property errors and partial-support warnings from caniemail.',
        icon: ShieldCheck,
        api: 'checkCss(css, clients)',
      },
      {
        path: '/style/a11y',
        label: 'Accessibility',
        description:
          'Auto-injected <title>, xml:lang, role="article" wrapper, and MISSING_TITLE warnings — toggle on/off and see the diff.',
        icon: Accessibility,
        api: 'compile() post-processor',
      },
    ],
    secondary: [
      {
        path: '/style/dark-mode',
        label: 'Dark Mode',
        description: 'Light vs dark preview with per-color override map. Built-in dark-mode pipeline.',
        icon: Moon,
      },
    ],
  },
  extend: {
    id: 'extend',
    icon: Plug,
    title: 'Extend',
    tagline: 'Plugin marketplace, introspection API, MCP server for AI agents.',
    body:
      "mailc was designed so other tools can build on top of it. Plugins add custom components. Introspection lets agents query the framework. The MCP server is the protocol bridge for AI clients like Cursor and Claude Desktop.",
    tools: [
      {
        path: '/extend/plugins',
        label: 'Plugin Marketplace',
        description:
          'Sample plugin design system (acme-hero, acme-feature, acme-price-card, acme-footer) shown as components and used in real emails.',
        icon: Store,
      },
      {
        path: '/extend/introspect',
        label: 'Introspect API',
        description:
          'Five tools — validate, components, output, nesting, data contract. Query the compiler instead of reading the docs.',
        icon: Telescope,
      },
      {
        path: '/extend/mcp',
        label: 'MCP for AI',
        description:
          'Live tool explorer for the Model Context Protocol server. 7 tools, copy-paste config for Cursor / Claude Desktop.',
        icon: Bot,
        badge: 'AI-native',
      },
    ],
  },
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

interface BucketLandingProps {
  bucketId: 'build' | 'style' | 'extend'
}

export function BucketLanding({ bucketId }: BucketLandingProps): JSX.Element {
  const bucket = BUCKETS[bucketId]
  const HeroIcon = bucket.icon

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3 w-3" />
          Playground
        </Link>

        {/* Hero */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mb-12"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center">
              <HeroIcon className="h-5 w-5 text-foreground/70" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{bucket.title}</h1>
              <p className="text-xs text-muted-foreground font-mono">/{bucket.id}</p>
            </div>
          </motion.div>
          <motion.p variants={fadeUp} className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            {bucket.tagline}
          </motion.p>
          <motion.p variants={fadeUp} className="mt-3 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {bucket.body}
          </motion.p>
        </motion.div>

        {/* Tool grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {bucket.tools.map((tool) => (
            <motion.div key={tool.path} variants={fadeUp}>
              <ToolCardView card={tool} />
            </motion.div>
          ))}
        </motion.div>

        {/* Secondary tools — reachable, not promoted */}
        {bucket.secondary && bucket.secondary.length > 0 && (
          <div className="mt-10 pt-6 border-t border-border">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Also available
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bucket.secondary.map((tool) => (
                <SecondaryCardView key={tool.path} card={tool} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SecondaryCardView({ card }: { card: ToolCard }): JSX.Element {
  const Icon = card.icon
  return (
    <Link
      to={card.path}
      className="group flex items-start gap-3 rounded-md border border-border bg-card hover:bg-surface transition-colors p-3"
    >
      <div className="w-7 h-7 rounded-md border border-border bg-surface flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-foreground/60" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium mb-0.5">{card.label}</div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{card.description}</p>
      </div>
      <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
    </Link>
  )
}

function ToolCardView({ card }: { card: ToolCard }): JSX.Element {
  const Icon = card.icon
  return (
    <Link
      to={card.path}
      className={cn(
        'group block relative rounded-xl border border-border bg-card p-5 transition-all duration-300 overflow-hidden h-full',
        'hover:border-foreground/25 hover:bg-surface'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-lg border border-border bg-surface flex items-center justify-center">
          <Icon className="h-4 w-4 text-foreground/70" />
        </div>
        {card.badge && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {card.badge}
          </span>
        )}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1.5">{card.label}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        {card.description}
      </p>
      <div className="flex items-center justify-between">
        {card.api ? (
          <code className="text-[10px] font-mono text-muted-foreground truncate">
            {card.api}
          </code>
        ) : (
          <span />
        )}
        <span className="text-xs font-medium text-foreground/60 group-hover:text-foreground inline-flex items-center gap-1 group-hover:gap-2 transition-all">
          Open <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  )
}
