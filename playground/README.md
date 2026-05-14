# mailc playground

> **The interactive showcase for `mailc` — a TypeScript-native email compiler with source maps, a plugin API, and an MCP server for AI agents.**

This document is two things at once:

1. **A product brief** — what mailc is, what makes it different, and every feature the playground demonstrates.
2. **A design brief** — read this end-to-end before you redesign the marketing site. It tells you which features deserve a marquee, which screens are flat today, and where users get lost.

If you're feeding this to Claude (or any designer) to rethink the website, **the most important sections are "The moat", "Playground tour", and "UX brief for design."**

---

## What is mailc?

mailc is a modern email compiler. You write a clean component model — `<mc-section>`, `<mc-column>`, `<mc-text>`, `<mc-button>` — and mailc emits the table-soup, inline-styled, VML-fallback'd HTML that actually renders correctly in Gmail, Outlook, Apple Mail, Yahoo, and 30+ other clients.

TypeScript-first, JSON-IR-aware, plugin-driven, source-mapped, and designed to be driven by tools and AI agents — not just typed by hand.

```ts
import { compile } from 'mailc'

const { html, warnings, sourceMap } = compile(`
  <mc>
    <mc-head><mc-title>Welcome</mc-title></mc-head>
    <mc-body>
      <mc-section>
        <mc-column>
          <mc-text>Hi there 👋</mc-text>
          <mc-button href="https://...">Get started</mc-button>
        </mc-column>
      </mc-section>
    </mc-body>
  </mc>
`, { sourceMap: true })
```

---

## The moat — why mailc, and not the alternatives

Every email compiler emits HTML. The reasons to pick mailc are about **what's around the compiler**:

### 1. Bidirectional source maps
Click an element in the rendered preview — jump to the markup that produced it. Edit the markup — the corresponding HTML highlights. Free, structured, no runtime cost. Built into `compile(src, { sourceMap: true })`.

### 2. A real plugin API
`defineComponent({ type, metadata, compile })` registers first-class custom components. Mailc ships a plugin marketplace with **6 design systems** (Mailc Essentials, Acme, Kicks & Co., Ecom Pro, Autopulse, Glow Mark) and **17+ sample emails**. Plugin authors get utilities (`escapeHtml`, `themeColor`, `warnCss`) re-exported from mailc itself — they don't reach into internals.

### 3. An introspection API
`introspect.canNest()`, `introspect.component()`, `introspect.componentSpecs()`, `introspect.validate()`, `introspect.extractDataContract()`. Tools (including the playground's own visual builder) call into the compiler to ask "is this drop allowed?", "what attributes does this component take?", "what variables does this template need?" — instead of reading the docs.

### 4. An MCP server for AI agents
mailc ships a Model Context Protocol server with 7 tools — `compile_email`, `validate_email_node`, `list_components`, `get_component_spec`, `can_nest`, `check_email_client_support`, `extract_data_contract`. Cursor and Claude Desktop can wire mailc up directly. AI-native by design.

### 5. Two styling paradigms — without picking sides
**Attribute mode** (HTML-style: `<mc-text color="#111">…`) is the default and works everywhere. **Class mode** brings Tailwind-style utilities (`bg-brand`, `text-lg`, `p-4`) backed by theme tokens. They coexist — pick per project, or mix.

### 6. Built-in client compatibility
Every compile runs CSS through caniemail's per-client database. Use `display: flex`? You'll get a structured warning naming the 6 clients that break. The `/style/compatibility` page lets you paste any CSS and see per-property errors and partial-support notes for 30+ clients.

### 7. Accessibility, baked in
On every `compile()`:
- **Document landmarks** — auto-injected `<title>`, `xml:lang`, `role="article"` wrapper. Emits `MISSING_TITLE` if `<mc-title>` is absent.
- **Image alt-text** — `MISSING_ALT` warnings, escalatable to errors via `enforceAltText: true`.
- **Color contrast** — walks the compiled HTML, computes WCAG ratios for every text+bg pair, emits `LOW_CONTRAST` warnings (4.5:1 for body, 3:1 for large/bold).
- **Table headers** — flags `<mc-table>` without `<th>` cells.

### 8. JSON IR as a first-class API
Same compile, two front doors: markup (`<mc-section>…`) or JSON (`{ type: "mc-section", children: […] }`). The JSON IR is what the visual builder writes, what plugins return from `compile()`, and what the MCP server passes around. No second parser, no second registry.

### 9. Structured fix instructions
Errors aren't strings. Every warning is `{ code, message, severity, fix }` — codes like `MISSING_ALT`, `LOW_CONTRAST`, `PLUGIN_CSS_COMPATIBILITY`, with `fix` lines machine-consumable for AI agents.

### 10. Compile-time, everywhere
No runtime JS. Pure static HTML output. Same API in browser and Node — CDN, bundler, or CLI. ~3,300 tests passing.

---

## Playground tour

The playground lives at three top-level buckets: **Build**, **Style**, **Extend**. Plus a 5-minute Tour at `/tour`.

### `/build` — Build emails, four ways

| Route | What it is | The hook |
|---|---|---|
| `/build/visual` | Drag-drop email composer. Sidebar of components, canvas with live preview, properties panel. | Now ships with a **welcome-email starter template** preloaded so the canvas isn't empty on first visit. Drops are gated by **`introspect.canNest()`** — the same predicate the validator uses at compile time. Header is the global NavBar + a slim builder toolbar (undo/redo, tab switcher, Load demo, Export). |
| `/build/code` | Markup playground with **bidirectional source maps**. Click preview → jump to source. Click source → highlight preview. | The flagship demo. Power-user mode. |
| `/build/json` | Same playground but with JSON IR as the input — the API tools and AI agents use programmatically. | Showcases the IR as a first-class authoring surface. |
| `/build/visual-json` | Drag-drop builder where the underlying state is JSON IR (vs markup). | The bridge between visual and programmatic. |
| `/build/templating` | Variables (`{{ user.name }}`), conditionals (`<mc-if>`), loops (`<mc-each>`). Sandboxed engine — **no `eval`, no `new Function`**. | Production-safe templating without the security tax. |
| `/build/sandbox` | Minimal markup → HTML sandbox, compiles in a worker. Instant feedback. | The "just let me try something" surface. |

### `/style` — Theme, switch modes, check compatibility

| Route | What it is | The hook |
|---|---|---|
| `/style/theme` | Edit color/spacing/font tokens. See your design system applied across emails. | Best paired with class mode. |
| `/style/class` | Tailwind-style utilities. Limited support — some props need attribute fallbacks. | Honest about what works. |
| `/style/modes` | Side-by-side: same email in attribute mode and class mode. | Trade-offs explicit instead of guessed. |
| `/style/compatibility` | Paste any CSS, pick target clients, see per-property errors and partial-support warnings from caniemail. Tabbed errors/warnings panel on the right. | Live `checkCss(css, clients)` API. |
| `/style/a11y` | All four a11y capabilities live: landmarks toggle (with/without `<mc-title>`), alt-text strict-mode toggle, contrast toggle, table-headers showcase. Each with side-by-side diffs and the actual `MISSING_TITLE`, `MISSING_ALT`, `LOW_CONTRAST`, `TABLE_MISSING_HEADERS` codes. | The accessibility story isn't a marketing claim — it's a working demo. |
| `/style/dark-mode` | Light vs dark preview with per-color override map. Built-in dark-mode pipeline. | |

### `/extend` — Plugins, introspection, MCP

| Route | What it is | The hook |
|---|---|---|
| `/extend/plugins` | The plugin marketplace. **6 brands**: Mailc Essentials (general-purpose), Acme (e-commerce sample), Kicks & Co. (sneakers/lifestyle), Ecom Pro, Autopulse (automotive), Glow Mark (beauty). Each brand → its components → its sample emails. | Real plugins shipping real emails — not a screenshot mock. |
| `/extend/plugins/mailc-essentials` | The flagship plugin. Components: `essentials-overlay-hero`, `essentials-stat-card-grid`, `essentials-category-grid`, `essentials-payment-timeline`, `essentials-brand-grid` ("Brands we support" pattern). | These are usable in any email — brand-agnostic building blocks. |
| `/extend/introspect` | Five tools: validate, components, output, nesting, data contract. Each is a working playground that calls `introspect.*` live. | The introspection API isn't documented in prose — you call it. |
| `/extend/mcp` | Live tool explorer for the MCP server. 7 tools, copy-paste config snippets for Cursor and Claude Desktop. | AI-native distribution. |

---

## What the visual builder does that competitors don't

This is the highlight reel for a marketing page:

- **Auto-loads a welcome-email starter** so first-time visitors see something they can edit, not an empty rectangle with "drag here".
- **Drop validation by `introspect.canNest()`** — the same compiler API that runs at validate time. Visible badge in the toolbar: "nesting validated by introspect."
- **Three views, one model** — Editor / Preview / Code, all backed by the same component tree, all undo/redoable, all exportable to `.mc` markup.
- **Drag from sidebar OR move existing elements** — both gated by the same nesting predicate.
- **Properties panel that knows the component** — inspector reads from the registry, types every field.

---

## Compiler internals worth name-dropping

For a technical audience, these are the proof points behind every claim above:

- **Compile-time rendering** — no runtime JS. Pure static HTML. Same `compile()` in browser and Node.
- **Email-safe HTML** — table-based layouts, inline styles, VML mso conditional comments for Outlook backgrounds, `mso-line-height-rule:exactly`, `font-size:0` spacers.
- **JSON IR with `compileFromJSON()`** — same compile pipeline, programmatic input.
- **Source maps as structured data** — `compile(src, { sourceMap: true })` returns `{ html, sourceMap }`, no string-embedded markers.
- **Plugin utilities** — `escapeHtml`, `themeColor`, `warnCss` re-exported as part of mailc's public API for plugin authors.
- **CSS classifier** — every property routed through a hardcoded BREAKING_DISPLAY_VALUES override + caniemail database; warnings carry the `PLUGIN_CSS_COMPATIBILITY` code.
- **Sandboxed templating** — no `eval`, no `new Function`. Tokenize → parse → evaluate.
- **3,300+ tests passing.** Status: early but solid.

---

## UX brief for design

The current playground is **honest and dense**, but the marketing site needs to be **interactive and intuitive**. Below is what's flat today and what should feel alive in the redesign.

### What's currently flat

1. **The hero** is a centered title + tagline + two CTAs. It tells you mailc exists. It doesn't show you what mailc does.
2. **The capability strip** (compile-time / email-safe / browser+node / components / AI-friendly) is text — read once, never looked at again.
3. **The "What you get with mailc" demos** are functional but presented as a uniform 2-col grid. Every card has the same weight; nothing draws the eye.
4. **The bucket cards (Build / Style / Extend)** are bullet lists. They list features but don't preview them.
5. **The visual builder landing screen** (until our last fix) was a blank canvas. First-time users had no idea what to do.

### What should feel interactive

1. **Hero should show mailc compiling something — live.** A type-on animation of `<mc-section>…</mc-section>` on the left, an animated reveal of the rendered email on the right. Maybe a hover-highlight that shows source ↔ output linking. Sell the source-map magic in the first 5 seconds.
2. **The "moat" features should be tactile cards.** Each of the 10 moat points above deserves its own demo card with a real interaction:
   - *Source maps* — hover lines, watch the highlight cross sides.
   - *Plugin API* — toggle through the 6 brands, see the email change.
   - *Introspect API* — run `canNest('mc-body', 'mc-text')` live and see the answer.
   - *MCP for AI* — show a Cursor-style chat with the MCP tools answering.
   - *Client compatibility* — type CSS, see clients light up red/amber/green.
   - *Accessibility* — toggle `accessibility.enabled` and watch warnings appear.
   - *JSON IR* — flip between markup and JSON for the same email.
   - *Structured errors* — click a warning, see the `{ code, fix }` shape.
3. **Bucket cards should preview their best route.** Hover on `Build` → mini animated screenshot of the visual builder. Hover on `Style` → theme tokens swapping colors live. Hover on `Extend` → MCP tool call with response. (Three videos / Lottie / mini iframes — your choice.)
4. **Scroll-jacked feature reveal.** The 10 moat points work as a vertical scroll story: each one snaps into view, animates its demo, scrolls past. Apple-product-page rhythm.
5. **The "before/after" comparison.** Show raw email HTML (200+ lines of nested `<table>`s) on the left and the equivalent mailc markup (15 lines) on the right. Animate the transformation.
6. **A live AI demo.** Embed a Claude-Desktop-style chat widget that calls the MCP server and renders the result. "Hey Claude, build me an order-confirmation email." → working email appears.
7. **Brand showcase carousel.** The 6 plugin brands deserve a horizontal carousel, each with one hero email rendered. Click → opens the brand detail page. Visual proof that real designers use this.

### What should feel intuitive

1. **First-time users in `/build/visual` should never see a blank canvas.** (Done — starter template auto-loads.)
2. **Every page should answer "what is this and what do I do?" in the first viewport.** Today many internal routes (`/extend/introspect/nesting`, `/style/dark-mode`) drop the user into a tool with no preamble. Each should open with a 2-line explanation + a single suggested action.
3. **The header should be consistent everywhere.** (Done — global NavBar + per-page sub-toolbar.)
4. **Breadcrumbs should be present on every internal route** so you always know how to get back.
5. **Empty states should suggest the obvious next step**, not just say "no data yet".
6. **Code should always be highlighted** — never raw text. (Mostly done with `prism-react-renderer`.)
7. **Hover states everywhere.** Every clickable thing should change on hover. Today some cards transition, others don't.
8. **One canonical CTA per page.** Today some pages have 4 CTAs of equal weight. Pick one primary, demote the rest.

### Tone

- **Honest, not hyped.** mailc is early; the README says "3,300 tests passing but the user base is small." Keep that voice.
- **Technical, not dumbed-down.** Audience is engineers and platform teams. They want to see the API, not metaphors.
- **Show, don't tell.** Every claim should have a demo that proves it.

### Visual language

- **Dark default, light supported.** The playground is dark-first; design should follow.
- **Monospace for code, sans for prose.** The playground uses Inter + JetBrains Mono. Don't fight it.
- **Subtle grid/dot backgrounds.** The hero already has this; lean in.
- **Accent colors are sparingly used** — sky, rose, violet, amber, emerald, teal — one accent per feature card. Don't rainbow everything.
- **Borders > shadows.** Email-friendly, in keeping with the product.

---

## Status

- **Compiler**: solid. 3,300+ tests passing across parser, validator, compiler, post-processors, plugins, introspection, MCP server, JSON IR.
- **Playground**: feature-complete for the v0.1 story. UX is honest but not yet intuitive — that's what this design pass is for.
- **User base**: small. We want real emails sent through real pipelines telling us what broke.

---

## Tech stack

- **Compiler**: TypeScript, zero runtime deps, Browser + Node bundles
- **Playground**: React 19, Vite, Tailwind, framer-motion, @dnd-kit, prism-react-renderer, CodeMirror
- **AI**: Model Context Protocol (MCP) server with 7 tools
- **Validation**: caniemail-sdk for client compatibility, internal a11y/contrast pipelines

---

## For the designer

If you only read four sections of this document:

1. **"The moat"** — the 10 features that need to land in the first 30 seconds of the homepage.
2. **"Playground tour"** — every internal route, what it does, and the marketing hook for it.
3. **"UX brief for design"** — what's flat, what should be interactive, what should be intuitive.
4. **"Visual language"** — the constraints that keep the redesign on-brand.

The goal: turn a dense, honest engineering playground into a marketing site that **shows the compiler working** in the first viewport and lets a curious engineer click into a working demo of every claim within two clicks.
