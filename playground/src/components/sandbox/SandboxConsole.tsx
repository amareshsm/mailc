/**
 * SandboxConsole — store-connected wrapper around the shared ConsolePanel.
 *
 * Reads from useSandboxStore and delegates all rendering to ConsolePanel.
 * Import ConsolePanel directly if you need a prop-driven version.
 */
import { useSandboxStore } from '@/store/sandbox-store'
import { ConsolePanel } from '@/components/ui/ConsolePanel'

export function SandboxConsole() {
  const {
    consoleEntries,
    consoleOpen,
    consoleFilter,
    toggleConsole,
    clearConsole,
    setConsoleFilter,
    jumpToMarkupLine,
  } = useSandboxStore()

  return (
    <ConsolePanel
      entries={consoleEntries}
      open={consoleOpen}
      filter={consoleFilter}
      onToggle={toggleConsole}
      onClear={clearConsole}
      onFilterChange={setConsoleFilter}
      onLocClick={(loc) => jumpToMarkupLine(loc.line)}
    />
  )
}

