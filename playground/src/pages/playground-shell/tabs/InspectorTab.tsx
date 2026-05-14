/**
 * Inspector tab — focused detail view for the selected source-map entry.
 * Reads the active store via `usePlayground()` so it works against either
 * the markup or JSON playground.
 */
import { Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getComponentMeta } from '@/lib/component-icons'
import { usePlayground } from '../playground-context'
import type { StyleOrigin } from '@/types/source-map'

export function InspectorTab() {
  const { useStore, selectSelectedEntry } = usePlayground()
  const selectedEntry = useStore(selectSelectedEntry)

  if (!selectedEntry) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6 py-8 bg-card">
        <Code2 className="h-6 w-6 text-muted-foreground/30" />
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
          Click a source line, HTML line, or layer<br />
          to inspect the matching component.
        </p>
      </div>
    )
  }

  const meta = getComponentMeta(selectedEntry.sourceComponent)
  const tagDisplay = selectedEntry.outputTag
    ? `<${selectedEntry.outputTag}>`
    : selectedEntry.sourceComponent

  return (
    <div className="h-full overflow-y-auto bg-card">
      <div className="px-3 py-3">
        <div className="flex items-center gap-1.5 mb-3">
          <meta.Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-[12px] font-semibold text-foreground">{meta.label}</span>
          <span className="text-[10px] text-muted-foreground/40 font-mono ml-1 truncate">
            {selectedEntry.sourceComponent}
          </span>
        </div>

        <SectionLabel>Source</SectionLabel>
        <DetailRow
          label="Lines"
          value={`${selectedEntry.sourceLoc.startLine} → ${selectedEntry.sourceLoc.endLine}`}
          accent="text-blue-500 dark:text-blue-400"
        />
        <DetailRow label="Col" value={selectedEntry.sourceLoc.startCol} />

        {selectedEntry.outputLoc && (
          <>
            <SectionLabel>Output</SectionLabel>
            <DetailRow
              label="Lines"
              value={`${selectedEntry.outputLoc.startLine} → ${selectedEntry.outputLoc.endLine}`}
              accent="text-blue-500 dark:text-blue-400"
            />
            {selectedEntry.outputRange && (
              <DetailRow
                label="Bytes"
                value={`${selectedEntry.outputRange.start}–${selectedEntry.outputRange.end} (${
                  selectedEntry.outputRange.end - selectedEntry.outputRange.start
                })`}
              />
            )}
          </>
        )}

        <SectionLabel>Meta</SectionLabel>
        {tagDisplay && <DetailRow label="Tag" value={tagDisplay} />}
        <DetailRow label="Role" value={selectedEntry.role} />
        {selectedEntry.children.length > 0 && (
          <DetailRow label="Children" value={selectedEntry.children.length} />
        )}

        {Object.keys(selectedEntry.sourceAttributes).length > 0 && (
          <>
            <SectionLabel>Attributes</SectionLabel>
            {Object.entries(selectedEntry.sourceAttributes).map(([k, v]) => (
              <DetailRow key={k} label={k} value={v || '(empty)'} />
            ))}
          </>
        )}

        {selectedEntry.styles.length > 0 && (
          <>
            <SectionLabel>Styles</SectionLabel>
            {selectedEntry.styles.map((s: StyleOrigin, i: number) => (
              <div key={i} className="flex items-start gap-1.5 py-0.5">
                <span
                  className={cn(
                    'text-[9px] px-1 py-px rounded shrink-0 leading-4 font-mono',
                    s.origin === 'tailwind-class' &&
                      'bg-sky-500/15 text-sky-600 dark:text-sky-400',
                    s.origin === 'attribute' &&
                      'bg-violet-500/15 text-violet-600 dark:text-violet-400',
                    s.origin === 'mc-attributes' &&
                      'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                    s.origin === 'component-default' &&
                      'bg-zinc-500/15 text-zinc-500 dark:text-zinc-400',
                    s.origin === 'post-processor' &&
                      'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  {s.origin
                    .replace('tailwind-class', 'tw')
                    .replace('component-default', 'default')
                    .replace('post-processor', 'post')
                    .replace('mc-attributes', 'mc-attr')}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0 leading-4">
                  {s.property}:
                </span>
                <span className="text-[10px] font-mono text-foreground/70 leading-4 break-all min-w-0">
                  {s.value}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider mt-3 first:mt-0 mb-1">
      {children}
    </p>
  )
}

function DetailRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="text-[10px] text-muted-foreground/60 w-20 shrink-0 pt-px">{label}</span>
      <span
        className={cn(
          'text-[10px] font-mono leading-relaxed break-all',
          accent ?? 'text-foreground/80',
        )}
      >
        {value}
      </span>
    </div>
  )
}
