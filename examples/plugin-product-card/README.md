# Plugin example: `<acme-product-card>`

A working, self-contained example of a mailc custom component. Uses
the `defineComponent()` API documented in [`docs/14-custom-components-plugins.md`](../../docs/14-custom-components-plugins.md).

## What this example shows

- How to define a real plugin with multiple required + optional attributes
- How to safely escape user-controlled strings in plugin output
- How to mark CSS-property attributes (`isCssPropAttr` + `classHint`)
- How to use the plugin in a template
- How to introspect the registered plugin via `introspect.component()`
- How to test all of the above

## Files

- `product-card-plugin.ts` — the plugin definition (compiler + metadata)
- `template.mc` — a sample template using the plugin
- `compile-demo.ts` — runnable script that registers the plugin, compiles the template, and prints output
- `product-card-plugin.test.ts` — vitest tests covering registration, compilation, escaping, introspection

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

- Source-map opt-in (advanced; see plugin-architecture-plan.md Decision 2)
- Container-style plugins (this is a leaf component, `maxChildren: 0`)
- npm packaging (the plugin file would export a `register*` function instead of running `defineComponent` at import)

For those patterns, see the [plugin docs FAQ](../../docs/14-custom-components-plugins.md#faq).
