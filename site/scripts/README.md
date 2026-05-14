# site/scripts/ — codegen for docs pages

Three Node scripts that emit MDX docs from the canonical sources in the main
mailc package. Output is committed to git so the docs site builds without
running the scripts; the scripts exist so we don't hand-maintain three
parallel sources of truth.

Run individually or all at once via the `site/package.json` scripts:

```bash
pnpm gen:components     # → content/docs/components/*.mdx
pnpm gen:error-codes    # → content/docs/api/error-codes.mdx
pnpm gen:mcp-tools      # → content/docs/api/mcp-server.mdx
pnpm gen:all            # all three in sequence
```

When to re-run: any time the underlying source changes. Each script's
"What triggers a re-run" section below names the file(s) to watch.

---

## `gen-component-pages.ts`

**What it does:** writes one MDX file per `<mc-*>` component into
`content/docs/components/<type>.mdx`.

**Source of truth:** the live mailc component registry, accessed via
`introspect.all()` from the built `mailc` package. So the script reads
`dist/` — you must run `pnpm --filter mailc build` first if you've changed
component metadata.

**What ends up in each page:**

- Frontmatter (`title`, `description`) from the component's metadata
- A "Quick facts" table (category, allowed parents/children, accepts text,
  accepts `class`, compiles-to elements)
- Required and optional attribute tables — names, types, defaults, examples,
  descriptions, and email-compatibility flags
- "Compiles to" section with the `compilerOutputReason` text
- An example markup block when the component metadata provides one
- A boilerplate "Programmatic access" section pointing to
  `introspect.component(type)`

**What it does NOT do:**

- It does not document `commonMistakes` (the field exists in metadata but
  isn't rendered)
- It does not render plugin-registered components — only built-ins exposed
  through `introspect.all()`
- It does not delete stale `.mdx` files when a component is removed from
  metadata (it lists files first, then writes; orphans need manual cleanup)

**When to re-run:** after editing `src/components/metadata.ts` or shipping
a new built-in component. Rebuild the lib first.

---

## `gen-error-codes-page.ts`

**What it does:** writes a single table-of-codes page to
`content/docs/api/error-codes.mdx` listing every value in the `ErrorCode`
enum, grouped by pipeline stage.

**Source of truth:** the enum in `src/errors/codes.ts`, read as raw text
(not via the built package). It parses the file line-by-line:

- Section comment headers of the form `// ── Group name ──` become the
  group headings in the output table
- Each `FOO_BAR = 'FOO_BAR',` line becomes a row

**Severity column:** *best-effort heuristic, not authoritative.* The
script's `inferSeverity()` function guesses from the group name (e.g.
group includes "accessibility" → `warning`). A small per-code override
list at the top of `inferSeverity()` handles codes that don't match their
group default — extend that list when you add an `info`-level code under a
warning-default group or similar mismatch. If this becomes painful, the
real fix is to encode severity in the enum itself rather than infer it.

**What it does NOT do:**

- It does not include the JSDoc explanation that often sits above each
  enum value — only the code name + heuristic severity
- It does not link to a per-code dedicated docs page (those don't exist;
  the in-CLI message currently links to `mailc.dev/errors/<CODE>` which
  is a vanity URL pending docs work)

**When to re-run:** after adding/removing/renaming entries in
`src/errors/codes.ts`.

---

## `gen-mcp-tools-page.ts`

**What it does:** writes `content/docs/api/mcp-server.mdx` documenting the
tools the mailc MCP server registers for AI agents.

**Source of truth:** two places, both parsed as text:

- `mcp-server/src/index.ts` for `server.registerTool(...)` call sites —
  tool name, title, description, and the import path of the input schema
- `mcp-server/src/tools/*.ts` for each per-tool input schema — parameter
  names, types (inferred from the Zod chain), required flag, descriptions

**What it does NOT do:**

- It does not execute the MCP server or call the registered tools — output
  shapes are not validated against real return values
- It does not document tool *outputs*; only the input parameters
- It does not handle Zod features beyond the common ones in our tools
  today (`z.string()`, `z.number()`, `z.boolean()`, `z.array()`,
  `z.object()`, `.optional()`, `.describe()`). New tools using exotic Zod
  combinators may render incompletely

**When to re-run:** after adding/changing tools in `mcp-server/src/`.

---

## Honest limitations across all three

- Each script writes its output unconditionally — there is no "is this
  already up to date" check. Running `gen:all` always touches all three
  output files, which will show as no-op diffs if nothing actually
  changed semantically.
- None of the scripts are wired into CI or pre-commit hooks. Forgetting to
  re-run after a metadata change is a real failure mode — the docs site
  will silently show stale content until someone re-runs the appropriate
  command.
- Outputs are simple text generators with hand-written string concatenation.
  No template engine. Quoting, escaping, and markdown safety are
  done ad-hoc in each script (`escapeTags`, `mdSafeDescription`, etc.).
  Edge-case input that breaks the markdown is possible.
