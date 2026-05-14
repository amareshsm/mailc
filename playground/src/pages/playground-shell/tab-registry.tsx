/**
 * Tab registry factory — builds a `TabRegistry` for the active playground
 * bundle. The source tab (Markup vs JSON) is the only entry that varies per
 * bundle; everything else is store-agnostic and reads via `usePlayground()`.
 */
import type { ReactNode } from 'react'
import type { TabRegistry } from 'react-splitkit'
import {
  CodeIcon,
  ConsoleIcon,
  DatabaseIcon,
  InspectorIcon,
  LayersIcon,
  MarkupIcon,
  PaletteIcon,
  PreviewIcon,
} from './icons'
import { SourceTab } from './tabs/SourceTab'
import { HtmlTab } from './tabs/HtmlTab'
import { PreviewTab } from './tabs/PreviewTab'
import { ConsoleTab } from './tabs/ConsoleTab'
import { DataTab } from './tabs/DataTab'
import { InspectorTab } from './tabs/InspectorTab'
import { LayersTab } from './tabs/LayersTab'
import { TokensTab } from './tabs/TokensTab'
import { JsonViewTab } from './tabs/JsonViewTab'
import { MarkupViewTab } from './tabs/MarkupViewTab'
import { EditTextTab } from './tabs/EditTextTab'
import { Edit3 } from 'lucide-react'
import type { PlaygroundBundle } from './playground-context'

const Label = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className="opacity-70">{icon}</span>
    {children}
  </span>
)

export function buildTabRegistry(bundle: PlaygroundBundle): TabRegistry {
  const sourceIcon = <MarkupIcon width={13} height={13} />
  const sourceLabel = bundle.sourceTitle

  // The complementary read-only viewer for the active route:
  //   • `/build/code` (markup source)  → JSON view derived from markup
  //   • `/build/json` (JSON source)    → Markup view derived from JSON
  // Distinct tabType keys (`json-view`, `markup-view`) so they don't collide
  // with the editable source tabs (`markup`, `json`).
  const isMarkupRoute = bundle.sourceTabType === 'markup'
  const viewerTabType = isMarkupRoute ? 'json-view' : 'markup-view'
  const viewerTitle = isMarkupRoute ? 'JSON' : 'Markup'
  const viewerIcon = isMarkupRoute ? (
    <CodeIcon width={13} height={13} />
  ) : (
    <MarkupIcon width={13} height={13} />
  )
  const ViewerComponent = isMarkupRoute ? JsonViewTab : MarkupViewTab

  return {
    [bundle.sourceTabType]: {
      tabType: bundle.sourceTabType,
      title: sourceLabel,
      icon: sourceIcon,
      closable: true,
      renderLabel: () => <Label icon={sourceIcon}>{sourceLabel}</Label>,
      render: () => <SourceTab />,
    },
    [viewerTabType]: {
      tabType: viewerTabType,
      title: viewerTitle,
      icon: viewerIcon,
      closable: true,
      renderLabel: () => <Label icon={viewerIcon}>{viewerTitle}</Label>,
      render: () => <ViewerComponent />,
    },
    html: {
      tabType: 'html',
      title: 'HTML',
      icon: <CodeIcon width={13} height={13} />,
      closable: true,
      renderLabel: () => <Label icon={<CodeIcon width={13} height={13} />}>HTML</Label>,
      render: () => <HtmlTab />,
    },
    preview: {
      tabType: 'preview',
      title: 'Preview',
      icon: <PreviewIcon width={13} height={13} />,
      closable: true,
      renderLabel: () => <Label icon={<PreviewIcon width={13} height={13} />}>Preview</Label>,
      render: () => <PreviewTab />,
    },
    inspector: {
      tabType: 'inspector',
      title: 'Inspector',
      icon: <InspectorIcon width={13} height={13} />,
      closable: true,
      renderLabel: () => <Label icon={<InspectorIcon width={13} height={13} />}>Inspector</Label>,
      render: () => <InspectorTab />,
    },
    layers: {
      tabType: 'layers',
      title: 'Layers',
      icon: <LayersIcon width={13} height={13} />,
      closable: true,
      renderLabel: () => <Label icon={<LayersIcon width={13} height={13} />}>Layers</Label>,
      render: () => <LayersTab />,
    },
    tokens: {
      tabType: 'tokens',
      title: 'Tokens',
      icon: <PaletteIcon width={13} height={13} />,
      closable: true,
      renderLabel: () => <Label icon={<PaletteIcon width={13} height={13} />}>Tokens</Label>,
      render: () => <TokensTab />,
    },
    console: {
      tabType: 'console',
      title: 'Console',
      icon: <ConsoleIcon width={13} height={13} />,
      closable: true,
      renderLabel: () => <Label icon={<ConsoleIcon width={13} height={13} />}>Console</Label>,
      render: () => <ConsoleTab />,
    },
    data: {
      tabType: 'data',
      title: 'Data',
      icon: <DatabaseIcon width={13} height={13} />,
      closable: true,
      renderLabel: () => <Label icon={<DatabaseIcon width={13} height={13} />}>Data</Label>,
      render: () => <DataTab />,
    },
    // Inline TipTap editor for the currently-selected text/button/title/preview
    // node. JSON route only — the markup route would need markup↔JSON round-
    // tripping which is a deeper change. The registry entry is harmless on the
    // markup side (it just shows the "select a text node" empty state).
    'edit-text': {
      tabType: 'edit-text',
      title: 'Edit',
      icon: <Edit3 className="h-3 w-3" />,
      closable: true,
      renderLabel: () => <Label icon={<Edit3 className="h-3 w-3" />}>Edit</Label>,
      render: () => <EditTextTab />,
    },
    'new-tab': {
      tabType: 'new-tab',
      title: 'New tab',
      availableInAddMenu: false,
      render: () => null,
    },
  }
}
