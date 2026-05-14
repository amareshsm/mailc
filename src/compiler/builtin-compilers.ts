/**
 * Built-in component compiler map.
 *
 * Static literal mapping of every built-in `mc-*` component type to its
 * compiler function. Consumed once at startup by `src/registry/init.ts` to
 * seed the runtime component registry. Not exported from the public package
 * — downstream code reads compilers via `getComponentCompiler()` from the
 * registry, or via the registry-backed `COMPONENT_COMPILERS` Proxy in
 * `src/compiler/registry.ts`.
 *
 * @module compiler/builtin-compilers
 */

import type { ComponentCompiler } from '../types.js';
import { compileMc } from './components/mc.js';
import { compileBody } from './components/body.js';
import { compileHead } from './components/head.js';
import { compilePreview } from './components/preview.js';
import { compileSection } from './components/section.js';
import { compileColumn } from './components/column.js';
import { compileGroup } from './components/group.js';
import { compileText } from './components/text.js';
import { compileImage } from './components/image.js';
import { compileButton } from './components/button.js';
import { compileDivider } from './components/divider.js';
import { compileSpacer } from './components/spacer.js';
import { compileRaw } from './components/raw.js';
import { compileTable } from './components/table.js';
import { compileHero } from './components/hero.js';
import { compileList, compileListItem } from './components/list.js';
import { compileLoopIteration } from './components/loop-iteration.js';
import { compileConditionalBranch } from './components/conditional-branch.js';

/** No-op compiler for tags that produce no standalone HTML (e.g. mc-title). */
function compileNoop(): string {
  return '';
}

/**
 * The literal map of built-in component types to their compilers.
 *
 * Plugins do NOT add entries here — they register against the runtime
 * registry via `defineComponent()` (Phase 2).
 */
export const BUILTIN_COMPONENT_COMPILERS: Record<string, ComponentCompiler> = {
  'mc': compileMc,
  'mc-body': compileBody as ComponentCompiler,
  'mc-head': compileHead,
  'mc-preview': compilePreview,
  'mc-section': compileSection,
  'mc-column': compileColumn,
  'mc-group': compileGroup,
  'mc-text': compileText,
  'mc-image': compileImage,
  'mc-button': compileButton,
  'mc-divider': compileDivider,
  'mc-spacer': compileSpacer,
  'mc-raw': compileRaw,
  'mc-table': compileTable,
  'mc-hero': compileHero,
  'mc-list': compileList,
  'mc-list-item': compileListItem,
  'mc-title': compileNoop,
  // Internal SM-D synthetic nodes — only present when debug: true
  '_mc-loop-iteration': compileLoopIteration,
  '_mc-conditional-branch': compileConditionalBranch,
};
