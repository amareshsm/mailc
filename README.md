# mailc

**A modern email markup compiler — attribute or Tailwind styling, email-safe, developer-first with native dynamic templating.**

Write emails as components. Compile to HTML that works in Gmail, Outlook, Apple Mail, and the rest of the long tail. Use Tailwind classes if you want; use plain CSS attributes if you don't.

```html
<mc>
  <mc-body>
    <mc-section padding="32px 0">
      <mc-column>
        <mc-text font-size="24px" font-weight="bold" align="center">
          Welcome aboard!
        </mc-text>
        <mc-button href="https://example.com" background-color="#0066cc" color="#ffffff">
          Get Started
        </mc-button>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>
```

```ts
import { compile } from 'mailc'

const { html, errors, warnings } = compile(source)
// html is ready to send. errors/warnings tell you what's broken.
```

That's the whole API for the common case.

> **Status:** early. The compiler is solid (3,700+ tests, all passing) but the user base is small. If you try it and hit something rough, please [open an issue](https://github.com/amareshsm/mailc/issues) — feedback at this stage is the most useful contribution you can make.

---

## Why mailc

Email HTML is awful. You can't use `flexbox`, `grid`, or modern CSS. You need tables nested inside tables. Outlook needs separate VML markup for backgrounds. Gmail strips `<style>` blocks under certain conditions. mailc handles all of that and gives you a clean component model on top.

**You'd reach for mailc when:**
- You want a TypeScript-native compiler with structured errors, not a black-box CLI
- You want to use Tailwind utilities, attribute-based styling, *or both*
- You want to build a tool *on top* of an email compiler — JSON IR, source maps, plugin API, AI-agent integration are first-class

---

## Install

```bash
npm install mailc
# or
pnpm add mailc
# or
yarn add mailc
```

Requires Node 20+ for the CLI / Node API. The browser bundle works in any modern browser.

---

## Quick start

### 1. Compile from a string

```ts
import { compile } from 'mailc'

const result = compile(`
  <mc>
    <mc-body>
      <mc-section>
        <mc-column>
          <mc-text>Hello {{user.name}}</mc-text>
        </mc-column>
      </mc-section>
    </mc-body>
  </mc>
`, {
  data: { user: { name: 'Ada' } },
})

console.log(result.html)        // production-ready HTML
console.log(result.errors)      // [] when clean
console.log(result.warnings)    // non-blocking issues
```

### 2. Compile from JSON (for builder UIs)

```ts
import { compileFromJSON } from 'mailc'

const result = compileFromJSON({
  type: 'mc',
  children: [
    {
      type: 'mc-body',
      children: [/* ... */],
    },
  ],
})
```

### 3. CLI

```bash
mailc build welcome.mc -o welcome.html
mailc validate welcome.mc
mailc watch welcome.mc -o welcome.html --serve   # live-reload preview server
mailc init                                       # scaffold a new project
mailc contract welcome.mc                        # show the data contract
```

### 4. Browser

```html
<script src="https://cdn.jsdelivr.net/npm/mailc/dist/browser.global.js"></script>
<script>
  const { html } = mailc.compile(source)
</script>
```

---

## Core capabilities

| | |
|---|---|
| **Compile-time rendering** | No runtime JS — pure static HTML output |
| **Email-safe HTML** | Table-based layouts, inline styles, Outlook VML, Gmail clip checks |
| **Browser + Node** | Same API everywhere — CDN, bundler, or CLI |
| **Component system** | `mc-section`, `mc-column`, `mc-text`, `mc-button`, `mc-image`, `mc-hero`, `mc-list`, … |
| **Two styling modes** | Attribute-based (`color="#0066cc"`) by default; opt-in Tailwind class mode for utility-first teams |
| **Theming & design tokens** | 12 extendable token scales — colors, spacing, fonts, radii, etc. |
| **Templating** | `{{variable}}`, `mc-if`, `mc-each`, sandboxed (no `eval`, no `Function`) |
| **caniemail integration** | Per-property compatibility checks against your declared `targetClients` |
| **Source maps** | Every output element traces back to its source node — bidirectional |
| **AI-friendly** | Structured `FixInstruction` errors, JSON IR, and an [MCP server](#mcp-server) for AI agents |
| **Plugin API** | `defineComponent({ type, metadata, compile })` for custom components |

---

## Two styling modes

mailc supports two styling paradigms. Pick what fits your team — or mix.

### Attribute mode (default)

Familiar HTML-style API. CSS-property attributes go directly on components.

```html
<mc-text color="#333" font-size="16px" padding="12px 0">
  Hello world
</mc-text>
```

### Class mode (limited support)

Tailwind-style utilities for teams that prefer utility-first. CSS-property attributes are flagged as warnings — you express styling via `class=""` instead.

```html
<mc-text class="text-[#333] text-[16px] py-3">
  Hello world
</mc-text>
```

```ts
compile(source, { templateStyle: 'class' })
```

Some attributes (e.g. border shorthands, `inner-background-color`) have no Tailwind equivalent today and remain attribute-only even in class mode.

---

## MCP server

mailc ships an [MCP](https://modelcontextprotocol.io) server so AI agents (Claude Desktop, Cursor, etc.) can author and validate emails with structured tools instead of guessing at email markup.

```json
// ~/.cursor/mcp.json or ~/.claude/claude_desktop_config.json
{
  "mcpServers": {
    "mailc": {
      "command": "npx",
      "args": ["-y", "mailc-mcp"]
    }
  }
}
```

Exposes 7 tools: `compile_email`, `validate_email_node`, `list_components`, `get_component_spec`, `can_nest`, `extract_data_contract`, `check_email_client_support`.

Once configured, ask your agent *"build me a welcome email using mailc"* and it'll use the tools to compile, validate, and self-correct using structured `FixInstruction` errors.

---

## Built for tools, not just for templates

mailc was designed so other tools can build on top of it. If you're building an email builder, design system, or AI integration:

- **JSON IR** — `compileFromJSON()` skips the markup parser entirely. Builder state is the input.
- **Source maps** — every output HTML element maps back to its source node with byte-precise ranges.
- **Introspection API** — `introspect.canNest()`, `introspect.componentSpec()`, `introspect.dataContract()`, and 8 more functions. Query the compiler instead of reading the docs.
- **Structured errors** — `FixInstruction` objects with `action` codes (`add-attribute`, `wrap-in`, `replace-with-class`, …) so a UI can render auto-fix buttons.
- **Native dynamic templating** — `{{variable}}`, `mc-if`, `mc-each` are part of the compiler, not a separate layer. Pass `data` to `compile()` and the contract is statically derivable via `extract_data_contract`.
- **Tailwind-style class mode** — opt in with `templateStyle: 'class'` and write `class="text-[#333] py-3"` instead of attributes. Same compiler, same output guarantees.
- **caniemail validation** — declare `targetClients` and the compiler flags properties that won't render in your audience's clients, with per-property compatibility data sourced from caniemail.

Try it: [the playground's introspection demo](#playground) shows all of these live.

---

## Playground

A full interactive playground with builder, theme studio, dynamic-email previews, marketplace plugins, and an introspection sandbox.

```bash
git clone https://github.com/amareshsm/mailc
cd mailc/playground
pnpm install && pnpm dev
```

---

## Documentation

Full docs live at the [mailc site](https://github.com/amareshsm/mailc/tree/main/site/content/docs) — getting started, components reference, CLI/API, theming, templating, accessibility, JSON IR, and plugin authoring.

---

## Contributing

Contributions, issues, and feedback are very welcome. Particularly useful at this stage:

- **Try it on a real email and tell me what broke.** That's the highest-signal feedback.
- **Tell me what's confusing in the docs.** I'm too close to it.
- **Open an issue if a component doesn't compile the way you expect.** The CSS-stripping decisions are deliberate but sometimes wrong.

```bash
git clone https://github.com/amareshsm/mailc
cd mailc
pnpm install
pnpm test
```

---

## Credits

mailc is heavily inspired by [MJML](https://mjml.io). Several proven layout
decisions were borrowed directly.
The snapshot test suite also uses MJML as the reference implementation that
mailc's output is checked against to catch regressions.

---

## License

MIT

---

*mailc is early-stage. The compiler works, but the ecosystem around it is still forming. If you'd like to help shape where it goes, the most useful thing you can do is try it on something real and share what you learn.*
