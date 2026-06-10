# Plugin example: `<acme-product-card>`

A working, self-contained example of a mailc custom component, built with the [`defineComponent()`](../../site/content/docs/api/define-component.mdx) API.

## What this example shows

- How to define a real plugin with multiple required + optional attributes
- How to safely escape user-controlled strings in plugin output
- How to mark CSS-property attributes (`isCssPropAttr` + `classHint`)
- How to use the plugin in a template via `compile(src, { plugins })`
- How to access plugin metadata directly on the returned `Plugin` value
- How to test all of the above

## Files

- `product-card-plugin.ts` — the plugin definition (compiler + metadata); exports a `productCardPlugin` value
- `template.mc` — a sample template using the plugin
- `compile-demo.ts` — runnable script that compiles the template with the plugin and prints output
- `product-card-plugin.test.ts` — vitest tests covering compilation, escaping, and metadata shape

## Run the demo

From the mailc repo root:

```bash
pnpm tsx examples/plugin-product-card/compile-demo.ts
```

You should see the compiled HTML output (with the `<acme-product-card>` replaced by an inline product-card table).

## Run the tests

```bash
pnpm vitest run examples/plugin-product-card/
```

## What this plugin does NOT cover (intentionally)

- **Source-map opt-in** — plugins can record entries via `context.sourceMap` when `debug` / `sourceMap` is enabled. Most plugins don't need this.
- **Container-style plugins** — this is a leaf component (`maxChildren: 0`). For a container, set `maxChildren: Infinity` and recurse into `node.children` inside `compile()` (call `compileNode(child, context)` for each).
- **npm packaging** — when shipping as a package, export the `Plugin` value as a named export so consumers can do `import { productCardPlugin } from '@acme/email-plugin'` and pass it to `compile(src, { plugins: [productCardPlugin] })`.
