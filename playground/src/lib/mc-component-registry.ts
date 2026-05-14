/**
 * MC component registry for the JSON builder.
 *
 * This is CLASS MODE ONLY — no color picker attributes, no CSS-property
 * attribute values. All styling goes through the `class` attribute using
 * Tailwind-like class names from the mailc theme system.
 *
 * GAP: In class mode, CSS-property attributes (color=, font-size=, padding=)
 * trigger CSS_ATTR_IN_CLASS_MODE validation errors. All styling must be
 * done via Tailwind classes on the `class` attribute. This means the
 * inspector cannot offer color pickers bound to inline hex values.
 */

/** Category of a component in the builder sidebar. */
export type MCBuilderComponentType = 'layout' | 'content'

/** Field type for inspector inputs. */
export type MCFieldType = 'text' | 'textarea' | 'url' | 'class'

/** A single field definition for the inspector panel. */
export interface MCFieldDef {
  /** The attribute key (or 'content' for the node's content property). */
  key: string
  /** Human-readable label shown in the inspector. */
  label: string
  /** Input type. */
  type: MCFieldType
  /** Placeholder text. */
  placeholder?: string
  /** Optional help text shown below the input. */
  help?: string
}

/** Describes a single MC component for the builder UI. */
export interface MCBuilderComponent {
  /** The mc-* tag name. */
  type: string
  /** Human-readable label for the sidebar. */
  label: string
  /** Lucide icon name to show in the sidebar. */
  icon: string
  /** Whether this is a layout or content component. */
  category: MCBuilderComponentType
  /** Default attributes to set on new instances. */
  defaultAttributes: Record<string, string>
  /** Default inner content for leaf nodes. */
  defaultContent?: string
  /** Whether this component can have children (layout containers). */
  acceptsChildren?: boolean
  /** Types of children this component accepts. */
  childTypes?: string[]
}

/** Registry of all MC components available in the JSON builder. */
export const mcComponentRegistry: Record<string, MCBuilderComponent> = {
  'mc-section': {
    type: 'mc-section',
    label: 'Section',
    icon: 'LayoutList',
    category: 'layout',
    defaultAttributes: { class: 'bg-white' },
    acceptsChildren: true,
    childTypes: ['mc-column'],
  },
  'mc-column': {
    type: 'mc-column',
    label: 'Column',
    icon: 'Columns2',
    category: 'layout',
    defaultAttributes: { class: '' },
    acceptsChildren: true,
    childTypes: ['mc-text', 'mc-button', 'mc-image', 'mc-divider', 'mc-spacer'],
  },
  'mc-text': {
    type: 'mc-text',
    label: 'Text',
    icon: 'Type',
    category: 'content',
    defaultContent: 'Edit this text',
    defaultAttributes: { class: 'text-base text-gray-900' },
  },
  'mc-button': {
    type: 'mc-button',
    label: 'Button',
    icon: 'MousePointerClick',
    category: 'content',
    defaultContent: 'Click me',
    defaultAttributes: {
      href: 'https://example.com',
      class: 'bg-blue-600 text-white font-semibold rounded',
    },
  },
  'mc-image': {
    type: 'mc-image',
    label: 'Image',
    icon: 'Image',
    category: 'content',
    defaultAttributes: {
      src: 'https://placehold.co/600x200/e2e8f0/64748b?text=Image',
      alt: 'Image',
      class: '',
    },
  },
  'mc-divider': {
    type: 'mc-divider',
    label: 'Divider',
    icon: 'Minus',
    category: 'content',
    defaultAttributes: { class: '' },
  },
  'mc-spacer': {
    type: 'mc-spacer',
    label: 'Spacer',
    icon: 'Space',
    category: 'content',
    // GAP: mc-spacer height must be set via class (e.g. class="h-8") in class mode.
    // Using height="32px" triggers CSS_ATTR_IN_CLASS_MODE validation error.
    defaultAttributes: { class: 'h-8' },
  },
}

/**
 * Field definitions for the inspector panel.
 * Maps component type → list of editable fields.
 *
 * NOTE: No color picker fields — in class mode, colors are applied
 * via Tailwind class names (e.g. text-red-500, bg-blue-600) rather
 * than inline color= attributes. See GAP note at top of file.
 */
export const MC_FIELD_DEFS: Record<string, MCFieldDef[]> = {
  'mc-section': [
    {
      key: 'class',
      label: 'CSS Classes',
      type: 'class',
      placeholder: 'bg-white px-4 py-8',
      help: 'Tailwind classes for this section.',
    },
  ],
  'mc-column': [
    {
      key: 'class',
      label: 'CSS Classes',
      type: 'class',
      placeholder: 'px-4',
      help: 'Tailwind classes for this column.',
    },
  ],
  'mc-text': [
    {
      key: 'content',
      label: 'Content',
      type: 'textarea',
      placeholder: 'Enter text content...',
    },
    {
      key: 'class',
      label: 'CSS Classes',
      type: 'class',
      placeholder: 'text-base text-gray-900',
      help: 'Use Tailwind text/font classes (e.g. text-lg font-semibold text-brand).',
    },
  ],
  'mc-button': [
    {
      key: 'content',
      label: 'Button Label',
      type: 'text',
      placeholder: 'Click me',
    },
    {
      key: 'href',
      label: 'Link URL',
      type: 'url',
      placeholder: 'https://example.com',
    },
    {
      key: 'class',
      label: 'CSS Classes',
      type: 'class',
      placeholder: 'bg-blue-600 text-white font-semibold rounded',
      help: 'Use Tailwind classes for button styling. Colors via class name (e.g. bg-brand, text-white).',
    },
  ],
  'mc-image': [
    {
      key: 'src',
      label: 'Image URL',
      type: 'url',
      placeholder: 'https://...',
    },
    {
      key: 'alt',
      label: 'Alt Text',
      type: 'text',
      placeholder: 'Describe the image',
    },
    {
      key: 'class',
      label: 'CSS Classes',
      type: 'class',
      placeholder: 'rounded-lg',
      help: 'Tailwind classes applied to the image.',
    },
  ],
  'mc-divider': [
    {
      key: 'class',
      label: 'CSS Classes',
      type: 'class',
      placeholder: 'border-gray-300',
      help: 'Tailwind classes for divider styling.',
    },
  ],
  'mc-spacer': [
    {
      key: 'class',
      label: 'CSS Classes',
      type: 'class',
      placeholder: 'h-8 or h-[32px]',
      // GAP: In class mode, use Tailwind height classes for spacer.
      // The height= attribute would trigger CSS_ATTR_IN_CLASS_MODE.
      // Use class="h-8" (32px), class="h-4" (16px), class="h-[48px]" (arbitrary), etc.
      help: 'In class mode, use Tailwind height classes. The height= attribute would trigger CSS_ATTR_IN_CLASS_MODE.',
    },
  ],
}

export function getMCLayoutComponents(): MCBuilderComponent[] {
  return Object.values(mcComponentRegistry).filter((c) => c.category === 'layout')
}

export function getMCContentComponents(): MCBuilderComponent[] {
  return Object.values(mcComponentRegistry).filter((c) => c.category === 'content')
}
