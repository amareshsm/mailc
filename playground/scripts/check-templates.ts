/**
 * Smoke check — every template in the unified registry compiles cleanly
 * in its tagged `templateStyle`.
 *
 * Catches the most common Phase B regression: a template tagged the wrong
 * `templateStyle` (e.g. an attribute-mode template tagged `'class'`, which
 * would surface as a `CSS_ATTR_IN_CLASS_MODE` error only when a user
 * happens to click that template in the source-map dropdown).
 *
 * Run via `npm run check:templates`. Exits 1 on any failure.
 */
import { compile } from 'mailc'
import { TEMPLATES, getCompileOptions } from '../src/templates'

interface Failure {
  id: string
  templateStyle: string
  category: string
  errors: { code: string; message: string }[]
}

const failures: Failure[] = []

for (const t of TEMPLATES) {
  const opts = getCompileOptions(t)
  const result = compile(t.markup, opts)
  if (result.errors.length > 0) {
    failures.push({
      id: t.id,
      templateStyle: t.templateStyle,
      category: t.category,
      errors: result.errors.map((e) => ({ code: e.code, message: e.message })),
    })
  }
}

const total = TEMPLATES.length
const failed = failures.length
const passed = total - failed

if (failed === 0) {
  process.stdout.write(`✓ ${passed}/${total} templates compile cleanly\n`)
  process.exit(0)
}

process.stderr.write(`✗ ${failed}/${total} templates have compile errors\n\n`)
for (const f of failures) {
  process.stderr.write(
    `  ${f.id}  [${f.category}, templateStyle="${f.templateStyle}"]\n`,
  )
  for (const e of f.errors) {
    process.stderr.write(`    - ${e.code}: ${e.message}\n`)
  }
  process.stderr.write('\n')
}
process.exit(1)
