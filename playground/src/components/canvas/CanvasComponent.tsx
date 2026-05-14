import { useDraggable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { GripVertical, Copy, Trash2, EyeOff } from 'lucide-react'
import type { EmailComponent } from '@/types/email'
import { componentRegistry } from '@/lib/component-registry'
import { useEmailStore } from '@/store/email-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getIcon } from '@/lib/icon-lookup'
import { DropZone } from './DropZone'

interface CanvasComponentProps {
  component: EmailComponent
  depth?: number
  isDragging?: boolean
}

// ─── Previews ─────────────────────────────────────────────────────────────────

function TextPreview({ component }: { component: EmailComponent }) {
  const a = component.attributes
  return (
    <div
      style={{
        color: a.color || '#000',
        fontSize: a['font-size'] || '16px',
        textAlign: (a.align as React.CSSProperties['textAlign']) || 'left',
        fontFamily: a['font-family'] || 'Arial, sans-serif',
        fontWeight: (a['font-weight'] || 'normal') as React.CSSProperties['fontWeight'],
        lineHeight: a['line-height'] || '1.5',
      }}
      dangerouslySetInnerHTML={{ __html: component.content || '<p>Edit this text…</p>' }}
    />
  )
}

function ImagePreview({ component }: { component: EmailComponent }) {
  const a = component.attributes
  const width = a.width || '600px'
  const borderRadius = a['border-radius'] || '0px'
  return (
    <div style={{ textAlign: (a.align as React.CSSProperties['textAlign']) || 'center' }}>
      <img
        src={a.src || 'https://placehold.co/600x200/e2e2e2/999?text=Image'}
        alt={a.alt || ''}
        style={{
          maxWidth: '100%',
          width: width,
          height: a.height || 'auto',
          objectFit: 'cover' as React.CSSProperties['objectFit'],
          display: 'inline-block',
          borderRadius: borderRadius,
        }}
      />
    </div>
  )
}

function ButtonPreview({ component }: { component: EmailComponent }) {
  const a = component.attributes
  return (
    <div style={{ textAlign: (a.align as React.CSSProperties['textAlign']) || 'center' }}>
      <span
        style={{
          backgroundColor: a['background-color'] || '#18181b',
          color: a.color || '#fff',
          borderRadius: a['border-radius'] || '6px',
          padding: a['inner-padding'] || '10px 24px',
          fontSize: a['font-size'] || '14px',
          fontWeight: (a['font-weight'] || '600') as React.CSSProperties['fontWeight'],
          fontFamily: a['font-family'] || 'Arial, sans-serif',
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        {component.content || 'Click me'}
      </span>
    </div>
  )
}

function DividerPreview({ component }: { component: EmailComponent }) {
  const a = component.attributes
  return (
    <div>
      <div
        style={{
          borderTop: `${a['border-width'] || '1px'} ${a['border-style'] || 'solid'} ${a['border-color'] || '#e4e4e7'}`,
          width: a.width || '100%',
          margin: '0 auto',
        }}
      />
    </div>
  )
}

function SpacerPreview({ component }: { component: EmailComponent }) {
  const h = component.attributes.height || '20px'
  return (
    <div
      className="flex items-center justify-center select-none"
      style={{ height: h, background: 'repeating-linear-gradient(90deg,#e4e4e7 0,#e4e4e7 4px,transparent 0,transparent 8px)' }}
    >
      <span className="bg-white px-2 text-[10px] text-zinc-400 font-mono">{h}</span>
    </div>
  )
}

function SocialPreview({ component }: { component: EmailComponent }) {
  const a = component.attributes
  const align = a.align || 'center'
  const iconSize = parseInt(a['icon-size'] || '24')
  const isVertical = a.mode === 'vertical'

  const networks = [
    { key: 'facebook', icon: 'https://www.mailjet.com/images/theme/v1/icons/ico-social/facebook.png', label: 'Facebook' },
    { key: 'twitter', icon: 'https://www.mailjet.com/images/theme/v1/icons/ico-social/twitter.png', label: 'Twitter' },
    { key: 'linkedin', icon: 'https://www.mailjet.com/images/theme/v1/icons/ico-social/linkedin.png', label: 'LinkedIn' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isVertical ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        gap: '12px',
        padding: '8px 0',
      }}
    >
      {networks.map((n) => (
        <div key={n.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img
            src={n.icon}
            alt={n.label}
            width={iconSize}
            height={iconSize}
            style={{ display: 'block', borderRadius: '3px' }}
          />
          <span style={{ fontSize: a['font-size'] || '12px', color: '#333', fontFamily: 'Arial, sans-serif' }}>
            {n.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function HeroPreview({ component }: { component: EmailComponent }) {
  const a = component.attributes
  const bgColor = a['background-color'] || '#18181b'
  const bgUrl = a['background-image']

  const style: React.CSSProperties = {
    backgroundColor: bgColor,
    borderRadius: '2px',
    minHeight: '100px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '32px 16px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
  if (bgUrl) {
    style.backgroundImage = `url(${bgUrl})`
  }

  const hasChildren = component.children && component.children.length > 0

  return (
    <div style={style}>
      {hasChildren ? (
        component.children!.map((child) => (
          <div key={child.id} style={{ width: '100%' }}>
            <ComponentPreview component={child} />
          </div>
        ))
      ) : (
        <>
          <p style={{ color: '#ffffff', fontSize: '24px', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', margin: '0 0 12px 0' }}>Hero Section</p>
          <span
            style={{
              backgroundColor: '#ffffff',
              color: '#18181b',
              borderRadius: '6px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '600',
              fontFamily: 'Arial, sans-serif',
              display: 'inline-block',
            }}
          >
            Learn More
          </span>
        </>
      )}
    </div>
  )
}

function ComponentPreview({ component }: { component: EmailComponent }) {
  switch (component.type) {
    case 'mc-text':    return <TextPreview component={component} />
    case 'mc-image':   return <ImagePreview component={component} />
    case 'mc-button':  return <ButtonPreview component={component} />
    case 'mc-divider': return <DividerPreview component={component} />
    case 'mc-spacer':  return <SpacerPreview component={component} />
    case 'mc-social':  return <SocialPreview component={component} />
    case 'mc-hero':    return <HeroPreview component={component} />
    default:           return <span className="text-xs text-muted-foreground">{component.type}</span>
  }
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CanvasComponent({ component, depth = 0, isDragging: globalDragging = false }: CanvasComponentProps) {
  const { selectedId, selectComponent, removeComponent, duplicateComponent, hiddenIds } = useEmailStore()

  const isSelected = selectedId === component.id
  const isHidden   = hiddenIds.has(component.id)
  const def        = componentRegistry[component.type]

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: component.id,
    data: { type: 'canvas-component', componentType: component.type },
  })

  const isSection = component.type === 'mc-section'
  const isColumn  = component.type === 'mc-column'
  const isGroup   = component.type === 'mc-group'

  const IconComponent = def ? getIcon(def.icon) : null

  // ── Hidden state ─────────────────────────────────────────────────────────────
  if (isHidden) {
    return (
      <div
        ref={setNodeRef}
        className="flex items-center gap-2 px-3 py-1.5 mx-2 my-0.5 rounded-md border border-dashed border-zinc-200 opacity-40 cursor-pointer hover:opacity-60 transition-opacity bg-zinc-50"
        onClick={(e) => { e.stopPropagation(); selectComponent(component.id) }}
      >
        <EyeOff className="h-3 w-3 text-zinc-400" />
        {IconComponent && <IconComponent className="h-3 w-3 text-zinc-400" />}
        <span className="text-[10px] text-zinc-400 font-medium">{def?.label} — hidden</span>
      </div>
    )
  }

  // ── Section: contains columns side-by-side ───────────────────────────────────
  if (isSection) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'group/section relative transition-all',
          'border-2',
          isSelected ? 'border-blue-400/60' : 'border-transparent hover:border-zinc-200',
          isDragging && 'opacity-40',
        )}
        style={{
          backgroundColor: component.attributes['background-color'] || '#ffffff',
          padding: component.attributes['padding'] || '20px 0',
        }}
        onClick={(e) => { e.stopPropagation(); selectComponent(component.id) }}
      >
        {/* Section label bar */}
        <div className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-0.5 bg-zinc-100/80 border-b border-zinc-200/60 opacity-0 transition-opacity',
          (isSelected || isDragging) ? 'opacity-100' : 'group-hover/section:opacity-100',
        )}>
          <div className="flex items-center gap-1.5">
            <div {...attributes} {...listeners} className="cursor-grab hover:bg-zinc-200 rounded p-0.5">
              <GripVertical className="h-3 w-3 text-zinc-400" />
            </div>
            {IconComponent && <IconComponent className="h-3 w-3 text-zinc-400" />}
            <span className="text-[10px] text-zinc-500 font-medium">Section</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" className="h-5 w-5 text-zinc-400 hover:text-zinc-700"
              onClick={(e) => { e.stopPropagation(); duplicateComponent(component.id) }}>
              <Copy className="h-2.5 w-2.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="h-5 w-5 text-zinc-400 hover:text-red-500"
              onClick={(e) => { e.stopPropagation(); removeComponent(component.id) }}>
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>

        {/* Columns row — mt-5 to clear the label bar */}
        <div className="flex mt-5">
          {component.children && component.children.length > 0 ? (
            component.children.map((col) => (
              <div key={col.id} className="flex-1 min-w-0">
                <CanvasComponent component={col} depth={depth + 1} isDragging={globalDragging} />
              </div>
            ))
          ) : (
            // Empty section — show a drop zone for columns
            <div className="flex-1 p-2">
              <DropZone
                id={`drop-${component.id}-0`}
                parentId={component.id}
                index={0}
                label="Drop a Column here"
                isDragging={globalDragging}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Column: stacks content vertically ───────────────────────────────────────
  if (isColumn) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'group/col relative transition-all min-h-15',
          'border-2 border-dashed',
          isSelected ? 'border-blue-400/50' : 'border-zinc-200/60 hover:border-zinc-300',
          isDragging && 'opacity-40',
        )}
        onClick={(e) => { e.stopPropagation(); selectComponent(component.id) }}
        style={{ backgroundColor: component.attributes['background-color'] || 'transparent' }}
      >
        {/* Column label */}
        <div className={cn(
          'flex items-center justify-between px-1.5 py-0.5 opacity-0 transition-opacity',
          (isSelected || isDragging) ? 'opacity-100' : 'group-hover/col:opacity-100',
        )}>
          <span className="text-[9px] text-zinc-400 font-medium uppercase tracking-wide">Column</span>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" className="h-4 w-4 text-zinc-400 hover:text-zinc-700"
              onClick={(e) => { e.stopPropagation(); duplicateComponent(component.id) }}>
              <Copy className="h-2 w-2" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="h-4 w-4 text-zinc-400 hover:text-red-500"
              onClick={(e) => { e.stopPropagation(); removeComponent(component.id) }}>
              <Trash2 className="h-2 w-2" />
            </Button>
          </div>
        </div>

        {/* Top drop zone — before first child */}
        <DropZone
          id={`drop-${component.id}-0`}
          parentId={component.id}
          index={0}
          label="Drop content here"
          compact
          isDragging={globalDragging}
          isEmpty={!component.children || component.children.length === 0}
        />

        {/* Children */}
        {component.children && component.children.map((child, idx) => (
          <div key={child.id}>
            <CanvasComponent component={child} depth={depth + 1} isDragging={globalDragging} />
            <DropZone
              id={`drop-${component.id}-${idx + 1}`}
              parentId={component.id}
              index={idx + 1}
              label="Drop here"
              compact
              isDragging={globalDragging}
            />
          </div>
        ))}
      </div>
    )
  }

  // ── Group: like section but for groups ───────────────────────────────────────
  if (isGroup) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'group/group relative transition-all border-2',
          isSelected ? 'border-blue-400/60' : 'border-transparent hover:border-zinc-200',
          isDragging && 'opacity-40',
        )}
        onClick={(e) => { e.stopPropagation(); selectComponent(component.id) }}
      >
        <div className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-0.5 bg-zinc-100/80 border-b border-zinc-200/60 opacity-0 transition-opacity z-10',
          (isSelected || isDragging) ? 'opacity-100' : 'group-hover/group:opacity-100',
        )}>
          <div className="flex items-center gap-1.5">
            <div {...attributes} {...listeners} className="cursor-grab hover:bg-zinc-200 rounded p-0.5">
              <GripVertical className="h-3 w-3 text-zinc-400" />
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">Group</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" className="h-5 w-5 text-zinc-400 hover:text-zinc-700"
              onClick={(e) => { e.stopPropagation(); duplicateComponent(component.id) }}>
              <Copy className="h-2.5 w-2.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="h-5 w-5 text-zinc-400 hover:text-red-500"
              onClick={(e) => { e.stopPropagation(); removeComponent(component.id) }}>
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>
        <div className="flex mt-5">
          {component.children && component.children.length > 0 ? (
            component.children.map((col) => (
              <div key={col.id} className="flex-1 min-w-0">
                <CanvasComponent component={col} depth={depth + 1} isDragging={globalDragging} />
              </div>
            ))
          ) : (
            <div className="flex-1 p-2">
              <DropZone
                id={`drop-${component.id}-0`}
                parentId={component.id}
                index={0}
                label="Drop a Column here"
                isDragging={globalDragging}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Content component (leaf) ──────────────────────────────────────────────────
  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className={cn(
        'group/content relative transition-all cursor-pointer',
        'border-2',
        isSelected ? 'border-blue-400/60' : 'border-transparent hover:border-zinc-200',
      )}
      onClick={(e) => { e.stopPropagation(); selectComponent(component.id) }}
    >
      {/* Content toolbar */}
      <div className={cn(
        'absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-0.5 bg-zinc-50/90 border-b border-zinc-200/60 opacity-0 transition-opacity z-10',
        (isSelected || isDragging) ? 'opacity-100' : 'group-hover/content:opacity-100',
      )}>
        <div className="flex items-center gap-1.5">
          <div {...attributes} {...listeners} className="cursor-grab hover:bg-zinc-200 rounded p-0.5">
            <GripVertical className="h-3 w-3 text-zinc-400" />
          </div>
          {IconComponent && <IconComponent className="h-3 w-3 text-zinc-400" />}
          <span className="text-[10px] text-zinc-500 font-medium">{def?.label}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" className="h-5 w-5 text-zinc-400 hover:text-zinc-700"
            onClick={(e) => { e.stopPropagation(); duplicateComponent(component.id) }}>
            <Copy className="h-2.5 w-2.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="h-5 w-5 text-zinc-400 hover:text-red-500"
            onClick={(e) => { e.stopPropagation(); removeComponent(component.id) }}>
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>

      <div className={cn(
        (isSelected || depth > 0) ? 'pt-6' : 'pt-1',
        isSelected && 'group-hover/content:pt-6',
      )}>
        <div style={{ padding: component.attributes.padding || '10px 25px' }}>
          <ComponentPreview component={component} />
        </div>
      </div>
    </motion.div>
  )
}
