# `templates/_data/` — private template data sources

This folder holds **raw template data** in the original source shapes.
The category files one level up (`showcase.ts`, `dynamic.ts`,
`theme-class.ts`, `theme-attribute.ts`) reshape these into the unified
`Template` schema and tag them with `category`, `templateStyle`, and
`features`.

## Boundary

- **Public API** for the playground — the [`templates/`](../) barrel
  (`@/templates`). Always import from there.
- **Internal data** — these files. Never import directly from any
  consumer outside `templates/`.

## Why two layers?

Keeping data and schema separate lets each category file declare its
metadata explicitly (per-template `templateStyle`, `features`,
`themeColors`, etc.) without those concerns leaking into the markup
files. The markup files stay focused on the templates themselves.

## Adding a new template

1. Add the markup entry to the appropriate `*.data.ts` file here.
2. Open the matching category file (`../showcase.ts`,
   `../theme-class.ts`, etc.) and ensure the new id appears in the
   metadata mapping with the right `templateStyle` and `features`.
3. Run `npm run check:templates` — the smoke check will compile your
   new template and surface any tagging mistakes.
