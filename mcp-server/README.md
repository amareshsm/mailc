# mailc-mcp

Model Context Protocol server for [mailc](https://github.com/amareshsm/mailc) — gives AI agents structured tools to author, validate, and render email templates with caniemail compatibility checks.

Built for Claude Desktop, Cursor, Mastra, LangGraph, Vercel AI SDK, and any other MCP-aware client.

## Why this exists

Today, when an AI generates email markup it's a one-shot text completion — broken templates surface only at runtime. mailc-mcp closes the loop:

```
AI generates JSON node
  → calls validate_email_node
  → gets structured FixInstruction with action + classHint + confidence
  → AI fixes itself
  → calls compile_email
  → ships guaranteed-valid HTML
```

The AI iterates inside a single user turn instead of round-tripping through chat.

## Tools

| Tool | What it does |
|---|---|
| `compile_email` | Renders mailc markup or JSON IR to email-safe HTML; returns errors, warnings, and a `partial` flag. |
| `validate_email_node` | Pre-flight check for one JSON node against its parent. Returns structured `FixInstruction` objects (`action`, `attribute`, `classHint`, `confidence`). |
| `list_components` | Lists every built-in `mc-*` component with category and description. Plugins are per-call values in the mailc API and are not enumerated. |
| `get_component_spec` | Full spec for one type: attributes (required/optional/CSS-prop), parents, children, what HTML it compiles to, and common mistakes. |
| `can_nest` | Quick `(parent, child) → boolean` structural check. Same data your visual builder uses for drop-target validity. |
| `extract_data_contract` | Static analysis of a template — required fields, optional fields (gated by mc-if), per-loop iteration shapes. The basis for typed SDK generation. |
| `check_email_client_support` | Validates a CSS declaration string against caniemail per-client support data. Returns per-client compat issues with severity and notes. |

## Install

```bash
npm install -g mailc-mcp
# or run on demand
npx mailc-mcp
```

## Usage in Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mailc": {
      "command": "npx",
      "args": ["-y", "mailc-mcp"]
    }
  }
}
```

Restart Claude Desktop. You should see a "mailc" entry in the connections panel with 7 tools.

## Usage in Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "mailc": {
      "command": "npx",
      "args": ["-y", "mailc-mcp"]
    }
  }
}
```

## Example AI prompts (once installed)

> "Write me a welcome email for an analytics startup. Use the mailc tools to validate every node before shipping the final markup."

> "I have user data shaped like `{ user: { name, email }, plan: { name, price } }`. Use `extract_data_contract` to verify a template I'll give you matches this shape."

> "Generate a receipt email. Before showing me the final HTML, run `check_email_client_support` against `outlook.*` to make sure nothing breaks."

## Tool I/O — quick reference

### compile_email

```ts
input:  { source?: string, jsonNode?: object, templateStyle?: 'attribute'|'class', compatibilityMode?: 'liberal'|'strict', data?: object }
output: { html: string|null, errors: [...], warnings: [...], info: [...], partial: boolean, stats: {...} }
```

### validate_email_node

```ts
input:  { node: { type, attributes? }, parentType?: string|null, templateStyle?: 'attribute'|'class' }
output: { valid: boolean, errors: [{ code, message, fix: { action, ... } }], warnings: [...] }
```

### list_components

```ts
input:  {}
output: { count: number, components: [{ type, category, description }] }
```

### get_component_spec

```ts
input:  { type: string }
output: ComponentSpec  // attributes, parents, children, compilesTo, example, commonMistakes
```

### can_nest

```ts
input:  { parent: string, child: string }
output: { parent, child, allowed: boolean }
```

### extract_data_contract

```ts
input:  { source: string }
output: { required: [...], optional: [...], loops: [...], summary: { requiredCount, optionalCount, loopCount } }
```

### check_email_client_support

```ts
input:  { css: string, targetClients?: string[] }   // e.g. ['gmail.*', 'outlook.*']
output: { success: boolean, issueCount, issues: [{ property, message, severity, affectedClients, notes }] }
```

## Local development

```bash
git clone <repo>
cd mcp-server
npm install
npm run build
node smoke-test.mjs   # end-to-end check that all 7 tools respond
```

To use your local dev build with Claude Desktop, point at the absolute path:

```json
{
  "mcpServers": {
    "mailc": {
      "command": "node",
      "args": ["/absolute/path/to/mailc/mcp-server/dist/index.js"]
    }
  }
}
```

## License

MIT
