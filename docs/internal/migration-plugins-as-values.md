# Migration plan: Plugins as values

**Status:** Draft — not yet executed.
**Owner:** Amaresh
**Estimated cost:** 2–3 focused days (4 phases, green tests at every checkpoint)
**Window:** Pre-publish — must land before v1.0 ships to npm.

---

## 1. Goal

Replace the current global-singleton component registry with a stateless
architecture where:

1. **Built-in components are static constants** known at build time.
2. **Plugins are values** returned by `defineComponent()`, not side effects.
3. **`compile()` accepts plugins as a per-call option.**
4. **`createCompiler()` factory** binds plugins once for many calls.
5. **No mutable globals.** No side-effect imports for registry seeding.

The pattern matches PostCSS, Vite, Babel, ESLint flat-config, and Rollup —
the modern convention every recent JS toolchain converged on.

---

## 2. Why now (pre-publish window)

Once mailc ships to npm, the global `defineComponent()` API becomes a
backwards-compatibility anchor. Every plugin author depends on its shape,
every doc references it, every example imports it. Removing it post-1.0
costs: major version bump + migration guide + community confusion +
weeks of issues.

Doing it now costs 2–3 days and lets v1.0 launch with the correct
architecture from day one.

### What the current design costs us

- **7 side-effect imports** (`import '../registry/init.js'`) across the
  codebase — invisible coupling, lint noise, tree-shaking hostile.
- **Lifecycle constraint**: `defineComponent()` throws if called after the
  first `compile()` — needed only because state is global and mutable.
- **No multi-instance support**: can't have two compilers with different
  plugins in the same process. Blocks multi-tenant servers, isolated
  tests, serverless cold-start patterns.
- **Test fragility**: plugin tests share global registry state and need
  `resetRegistry()` between cases. Order-dependent failures still appear.
- **AI agent friction**: stateless retries can't depend on prior
  `defineComponent` calls.

---

## 3. End state — the new API

### Common case (zero plugins) — unchanged

```ts
import { compile } from 'mailc';
const result = compile(source);
```

No regression in ergonomics for the most common path.

### Authoring a plugin — returns a value

```ts
import { defineComponent } from 'mailc';

export const acmeCardPlugin = defineComponent({
  type: 'acme-card',
  metadata: { /* ... */ },
  compile: (node, ctx) => `<div>${node.content ?? ''}</div>`,
});
```

`defineComponent` becomes pure — no global mutation. Returns a `Plugin`
value.

### Using plugins — pass per call

```ts
import { compile } from 'mailc';
import { acmeCardPlugin } from './acme-card.js';

const result = compile(source, {
  plugins: [acmeCardPlugin],
});
```

Stateless. Idempotent. Agent-friendly.

### Convenience factory — bind plugins once

```ts
import { createCompiler } from 'mailc';
import { acmeCardPlugin, acmeQuotePlugin } from './plugins.js';

const mailc = createCompiler({
  plugins: [acmeCardPlugin, acmeQuotePlugin],
  config: { width: 600 },
});

mailc.compile(welcome);
mailc.compile(receipt);
mailc.compile(newsletter);
```

`createCompiler()` is sugar — `compile(source, opts)` is the underlying
primitive.

### Multi-tenant — different plugins per tenant

```ts
const tenantA = createCompiler({ plugins: tenantA_plugins });
const tenantB = createCompiler({ plugins: tenantB_plugins });

// Coexist in one process. Impossible today.
```

---

## 4. Architectural shift

| Concern | Today (global singleton) | After migration (plugins as values) |
|---|---|---|
| Built-in metadata storage | Runtime `Map`, seeded on import | Static `const` from `metadata.ts` |
| Built-in compilers | Runtime `Map`, seeded on import | Static `const` from `builtin-compilers.ts` |
| Plugin storage | Global mutable `Map` | None — plugins flow through `compile()` |
| `defineComponent()` | Mutates global state | Returns a `Plugin` value (pure) |
| Compile-time registry view | `getComponentMetadata(type)` reads global | `ctx.registry.get(type)` reads per-call merged view |
| Lifecycle constraint | `compileStarted` flag throws if late `defineComponent` | None — no global to protect |
| Multi-instance | Impossible | Trivial — each compiler scope is its own registry |
| `import '../registry/init.js'` | 7 sites across codebase | Zero — deleted |

---

## 5. Migration phases

Four phases, each leaves the test suite green. Land each as its own
commit/PR for easy bisect and review.

### Phase 1 — Static registry view, registry kept internally (1 day)

**Goal:** Replace runtime `Map` with a context-scoped registry. Built-ins
become static. Plugin storage still global temporarily (we'll remove it
in Phase 3).

**Changes:**

1. New `src/registry/builtin-registry.ts` — exports `BUILTIN_METADATA` and
   `BUILTIN_COMPILERS` as plain `const`s, derived from
   `components/metadata.ts` and `compiler/builtin-compilers.ts`.
2. New `src/registry/registry-view.ts` — exports
   `createRegistryView({plugins})` which returns a frozen view over
   built-ins + plugins.
3. `compile.ts` builds a `RegistryView` for each call and threads it
   through `context.registry`.
4. `getComponentMetadata(type)` becomes a method on the view, not a
   module-level function. Old top-level export becomes a deprecated
   wrapper that reads from a process-wide singleton view (for back-compat
   during the rest of the migration).
5. Delete `seedBuiltins()` and the auto-seed line in
   `src/registry/init.ts`. The seven `import './registry/init.js'`
   side-effects become no-ops (kept temporarily for back-compat — removed
   in Phase 4).

**Checkpoint:** `pnpm vitest run` — all 3,407 tests pass (including 2 skipped
mc-raw drift). No behaviour change.

---

### Phase 2 — `compile(source, { plugins })` accepts plugins per call (0.5 day)

**Goal:** New per-call plugin injection path lives alongside the global
one. Both work.

**Changes:**

1. Extend `CompileOptions` with `plugins?: Plugin[]`.
2. `compile.ts` merges the per-call plugins into the registry view
   before dispatch.
3. `compileFromJSON()` mirrors the same option.
4. Add 5–10 tests in `tests/compile/plugins-per-call.test.ts` covering:
   - Plugin only registered per-call works
   - Per-call plugin doesn't leak to subsequent calls without it
   - Per-call + global plugin coexist (global ones still work)
   - Per-call plugin overrides built-in (or errors — design decision below)

**Checkpoint:** all 3,407+ tests green. New API path proven.

---

### Phase 3 — `defineComponent()` returns a value; remove global registration (1 day)

**Goal:** The flip. `defineComponent()` no longer mutates anything.
Tests + examples migrated to per-call plugins.

**Changes:**

1. Rewrite `src/define-component.ts`:
   - `defineComponent(spec): Plugin` returns the spec frozen as a
     `Plugin` value.
   - Delete `registerPluginComponent()` call inside.
   - Delete the `compileStarted` lifecycle check.
2. Delete `pluginMap` from `src/registry/component-registry.ts`.
3. Add `createCompiler({ plugins, config })` factory in `src/index.ts` —
   returns `{ compile, compileFromJSON }` methods bound to the plugin set.
4. **Migrate every plugin test** in `tests/plugin/` to the new pattern:
   ```ts
   // before:
   defineComponent({ ... });
   compile(template);
   // after:
   const plugin = defineComponent({ ... });
   compile(template, { plugins: [plugin] });
   ```
   ~30 test sites — mechanical change.
5. Update introspect tests: `introspect.all()` accepts an optional
   `{ plugins }` arg to enumerate per-set, defaults to built-ins only.
6. Migrate playground/site usages — they likely use `defineComponent`
   inline somewhere; switch to per-call.

**Checkpoint:** all tests green. No more global plugin state.

---

### Phase 4 — Cleanup (0.5 day)

**Goal:** Delete the dead code from Phases 1–3.

**Changes:**

1. Delete `src/registry/init.ts` entirely.
2. Delete the 7 `import './registry/init.js'` side-effect imports across
   the codebase:
   - `src/compile.ts`
   - `src/define-component.ts`
   - `src/validator/rules.ts`
   - `src/introspect/registry.ts`
   - `src/compiler/registry.ts`
   - `src/components/css-prop-attrs.ts`
   - `src/json/json-to-markup.ts`
3. Delete `seedBuiltinComponent`, `seedBuiltinMetadataOnly`,
   `_notifyChangeForSeed`, and the `seeded` flag from
   `src/registry/component-registry.ts`. What remains is pure
   per-call registry views.
4. Delete the `compileStarted` flag and `_resetForTest` helper.
5. Update docs:
   - `README.md` plugin section
   - `site/content/docs/api/plugins.mdx` (or wherever plugins are
     documented)
   - `mcp-server/README.md` if it references plugins
6. Replace `defineComponent` references in `templates/` if any.

**Checkpoint:** all tests green. Codebase has zero side-effect registry
imports. Final state achieved.

---

## 6. File-by-file inventory

Files that **will be touched** (sorted by phase):

### Phase 1
- `src/registry/builtin-registry.ts` *(new)*
- `src/registry/registry-view.ts` *(new)*
- `src/compile.ts`
- `src/json/index.ts`
- `src/registry/init.ts` *(strip auto-seed)*
- `src/registry/component-registry.ts` *(deprecate module-level read fns)*

### Phase 2
- `src/types.ts` (add `plugins?: Plugin[]` to `CompileOptions`)
- `src/compile.ts`
- `src/json/index.ts`
- `tests/compile/plugins-per-call.test.ts` *(new)*

### Phase 3
- `src/define-component.ts` (rewrite)
- `src/registry/component-registry.ts` (delete plugin map)
- `src/index.ts` (add `createCompiler`)
- `tests/plugin/define-component.test.ts` (migrate)
- `tests/plugin/edge-cases.test.ts` (migrate)
- `tests/plugin/*.test.ts` (any others)
- `playground/src/**` (any inline `defineComponent` calls)
- `site/content/docs/**/plugins*.mdx`

### Phase 4
- `src/registry/init.ts` *(delete)*
- All seven side-effect imports *(delete)*
- `src/registry/component-registry.ts` *(remove seed functions)*
- Documentation refresh

Files that **will not change**:
- `src/components/metadata.ts` — already a static const, perfect as-is
- `src/compiler/builtin-compilers.ts` — already a static const
- `src/compiler/components/*.ts` — individual compilers unchanged
- All post-processor code (assembler, inliner, etc.) — unchanged
- All linter, source-map, tokenizer, parser code — unchanged

---

## 7. Test strategy

### Test inventory before starting

- 134 test files, 3,407 tests, 2 skipped (the round-trip mc-raw cases).
- All test cases will continue to pass at every phase checkpoint. If
  any phase ends red, halt and fix before moving on.

### What gets added

- `tests/compile/plugins-per-call.test.ts` — new behaviour added in Phase 2.
- New round-trip cases (if any plugin test fixtures change behaviour).

### What gets migrated (not deleted)

- ~30 sites in `tests/plugin/` move from the imperative
  `defineComponent(); compile()` shape to the value-passing shape. Same
  assertions, same coverage.

### Regression guards

- `tests/json/round-trip-templates.test.ts` (added recently) — guards
  the metadata-driven serializer behaviour. Stays green throughout.
- `tests/compiler/compiler.test.ts` — guards registry contents (currently
  20 compilers registered). Update once if Phase 1 changes the assertion
  shape; otherwise unchanged.

---

## 8. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Phase 3's flip breaks ~30 plugin tests at once | High | Migrate tests in the same PR; CI catches anything missed |
| External consumers (playground, site) call `defineComponent()` ambient-style | Medium | Phase 3 grep + manual migration before merge |
| MCP server's `list_components` tool depends on global plugin enumeration | Medium | Decide: pass plugins to MCP tool params (recommended), or have MCP only list built-ins |
| Plugin compile errors silently swallowed differ between paths | Low | Phase 2 tests assert error surfaces match between per-call and (still working) global path |
| Introduces new `Plugin` value shape — type churn in plugin code | Low | Spec is small and matches `DefineComponentSpec` directly |
| `createCompiler()` adds API surface to maintain | Low | Thin wrapper — under 30 lines |

### Hard stops (halt and reconsider if any of these happen)

- Round-trip invariant test fails at any phase checkpoint
- Any built-in compiler changes output bytes
- Performance regression > 5% on the benchmark suite
- Plugin error semantics differ from current behaviour (e.g. a plugin
  throwing produces different `PLUGIN_COMPILE_ERROR` shape)

---

## 9. Open design questions

### Q1. `compile(source, { plugins })` — name and shape

Confirmed: `plugins: Plugin[]`. Order in the array determines override
precedence (last wins if two plugins declare the same `type`).

### Q2. Plugin overriding a built-in — error or allow?

**Proposal:** Error by default with a clear message. Allow override via
`{ overrideBuiltins: true }` escape hatch.

Reason: silently shadowing `mc-section` with a plugin called `mc-section`
is almost always a bug. The escape hatch covers the legitimate "I'm
forking the framework" case.

### Q3. `createCompiler()` — should it expose `defineComponent` as a method?

**Proposal:** No. `defineComponent` stays a top-level export. Compilers
just take plugin values. Keeps the API surface minimal.

### Q4. Should `Plugin` be branded for type safety?

**Proposal:** Yes. `defineComponent` returns a branded `Plugin` type so
users can't pass arbitrary objects into `plugins:`. Small ergonomic win.

```ts
declare const PluginBrand: unique symbol;
export interface Plugin {
  readonly [PluginBrand]: true;
  readonly type: string;
  readonly metadata: ComponentMetadata;
  readonly compile: ComponentCompiler;
}
```

### Q5. MCP server — how does it handle plugins?

The current `list_components` tool reads the global registry. Three
options:

- **(a)** Add a `plugins?: Plugin[]` parameter to every MCP tool that
  needs them, mirroring `compile()`. Most consistent.
- **(b)** MCP server lists built-ins only. Plugin authors document
  their plugins separately.
- **(c)** MCP server accepts a "plugin manifest" URL at startup.

**Proposal:** (a). Consistent with the new API everywhere else.

### Q6. Backwards-compatibility shim for `defineComponent` ambient mode?

**Proposal:** No shim. We're pre-publish — there are no users to break.
A shim doubles the maintenance burden and obscures the new pattern.

---

## 10. Out of scope (do later, separately)

- **Tokenizer raw-text mode for `mc-raw`** (Gap 3 from earlier audit) —
  separate change, tracked in `KNOWN_DRIFT` test skip list.
- **MCP server `prompts` and `resources` registration** — separate
  feature, doesn't interact with the registry.
- **Visual builder plugin marketplace** — UI feature, separate timeline.
- **`mailc format` CLI command** — formatting concern, unrelated.
- **Comments-as-nodes in JSON IR** — separate feature.

---

## 11. Sign-off checklist (run before merging Phase 4)

- [ ] All 3,407 tests pass (+ any new tests added during migration)
- [ ] 2 expected skips stay skipped (mc-raw round-trip drift)
- [ ] `pnpm typecheck` clean
- [ ] `pnpm build` clean
- [ ] Zero matches for `import '../registry/init.js'` in `src/`
- [ ] Zero matches for `import './registry/init.js'` in `src/`
- [ ] `seedBuiltins` / `compileStarted` / `_notifyChangeForSeed` not
      present anywhere
- [ ] README + plugin docs reflect new API
- [ ] Playground compiles + runs locally
- [ ] Site docs regenerated (`pnpm gen:all`)
- [ ] Bench suite shows no >5% regression
- [ ] Manual smoke test: register a plugin via the new API, compile,
      inspect output

---

## 12. Estimated total

| Phase | Effort | Cumulative |
|---|---|---|
| Phase 1 — internal view | 1 day | 1 day |
| Phase 2 — per-call plugins | 0.5 day | 1.5 days |
| Phase 3 — flip + test migration | 1 day | 2.5 days |
| Phase 4 — cleanup | 0.5 day | 3 days |
| **Total** | | **~3 days** |

Buffer for unknowns: **+1 day** → **plan for 4 days**.

---

## 13. References

- Original audit: in-conversation, ~2026-05-11
- PostCSS plugin model: `postcss([plugin1, plugin2]).process(css)`
- Vite plugin model: `defineConfig({ plugins: [react()] })`
- ESLint flat config: `export default [pluginA, pluginB]`
- Side-effect import discussion: `import '../registry/init.js'` in 7
  files today
- Current `defineComponent` API: `src/define-component.ts`
