import type { ComponentDefinition, ComponentType, AttributeDefinition } from '@/types/email'

export const componentRegistry: Record<ComponentType, ComponentDefinition> = {
  'mc-section': {
    type: 'mc-section',
    label: 'Section',
    icon: 'LayoutList',
    category: 'layout',
    defaultAttributes: {
      'padding': '20px 0',
      'background-color': '#ffffff',
    },
    acceptsChildren: true,
    childTypes: ['mc-column', 'mc-group'],
  },
  'mc-column': {
    type: 'mc-column',
    label: 'Column',
    icon: 'Columns2',
    category: 'layout',
    defaultAttributes: {
      'padding': '0',
    },
    acceptsChildren: true,
    childTypes: ['mc-text', 'mc-image', 'mc-button', 'mc-divider', 'mc-spacer', 'mc-social'],
  },
  'mc-group': {
    type: 'mc-group',
    label: 'Group',
    icon: 'Group',
    category: 'layout',
    defaultAttributes: {},
    acceptsChildren: true,
    childTypes: ['mc-column'],
  },
  'mc-text': {
    type: 'mc-text',
    label: 'Text',
    icon: 'Type',
    category: 'content',
    defaultAttributes: {
      'padding': '10px 25px',
      'font-size': '16px',
      'color': '#000000',
      'line-height': '1.5',
      'font-family': 'Arial, sans-serif',
    },
    defaultContent: '<p>Edit this text</p>',
  },
  'mc-image': {
    type: 'mc-image',
    label: 'Image',
    icon: 'Image',
    category: 'content',
    defaultAttributes: {
      'src': 'https://placehold.co/600x300/e2e2e2/999999?text=Image',
      'alt': 'Image',
      'width': '600px',
      'padding': '10px 25px',
    },
  },
  'mc-button': {
    type: 'mc-button',
    label: 'Button',
    icon: 'MousePointerClick',
    category: 'content',
    defaultAttributes: {
      'background-color': '#18181b',
      'color': '#ffffff',
      'font-size': '14px',
      'font-weight': '600',
      'border-radius': '6px',
      'padding': '10px 25px',
      'inner-padding': '12px 24px',
      'href': '#',
      'font-family': 'Arial, sans-serif',
    },
    defaultContent: 'Click me',
  },
  'mc-divider': {
    type: 'mc-divider',
    label: 'Divider',
    icon: 'Minus',
    category: 'content',
    defaultAttributes: {
      'border-color': '#e4e4e7',
      'border-width': '1px',
      'border-style': 'solid',
      'padding': '10px 25px',
    },
  },
  'mc-spacer': {
    type: 'mc-spacer',
    label: 'Spacer',
    icon: 'Space',
    category: 'content',
    defaultAttributes: {
      'height': '30px',
    },
  },
  'mc-social': {
    type: 'mc-social',
    label: 'Social',
    icon: 'Share2',
    category: 'content',
    defaultAttributes: {
      'font-size': '12px',
      'icon-size': '24px',
      'mode': 'horizontal',
      'padding': '10px 25px',
    },
    defaultContent: 'social',
  },
  'mc-hero': {
    type: 'mc-hero',
    label: 'Hero',
    icon: 'Sparkles',
    category: 'content',
    defaultAttributes: {
      'background-color': '#18181b',
      'height': '300px',
      'mode': 'fluid-height',
      'padding': '40px 0',
      'vertical-align': 'middle',
    },
    defaultContent: 'hero',
    acceptsChildren: true,
    childTypes: ['mc-text', 'mc-image', 'mc-button'],
  },
}

export const attributeDefinitions: Record<string, AttributeDefinition[]> = {
  'mc-section': [
    { key: 'background-color', label: 'Background', type: 'color' },
    { key: 'padding', label: 'Padding', type: 'text', placeholder: '20px 0' },
    { key: 'border', label: 'Border', type: 'text', placeholder: '1px solid #ccc' },
    { key: 'border-radius', label: 'Border Radius', type: 'text', placeholder: '0px' },
    { key: 'full-width', label: 'Full Width', type: 'select', options: ['', 'full-width'] },
    { key: 'text-align', label: 'Text Align', type: 'select', options: ['left', 'center', 'right'] },
  ],
  'mc-column': [
    { key: 'background-color', label: 'Background', type: 'color' },
    { key: 'padding', label: 'Padding', type: 'text', placeholder: '0' },
    { key: 'width', label: 'Width', type: 'text', placeholder: '50%' },
    { key: 'border', label: 'Border', type: 'text', placeholder: '1px solid #ccc' },
    { key: 'border-radius', label: 'Border Radius', type: 'text', placeholder: '0px' },
    { key: 'vertical-align', label: 'V-Align', type: 'select', options: ['top', 'middle', 'bottom'] },
  ],
  'mc-group': [
    { key: 'background-color', label: 'Background', type: 'color' },
    { key: 'width', label: 'Width', type: 'text', placeholder: '100%' },
  ],
  'mc-text': [
    { key: 'content', label: 'Content', type: 'textarea', placeholder: 'Enter text...' },
    { key: 'color', label: 'Color', type: 'color' },
    { key: 'font-size', label: 'Font Size', type: 'text', placeholder: '16px' },
    { key: 'font-family', label: 'Font Family', type: 'text', placeholder: 'Arial, sans-serif' },
    { key: 'font-weight', label: 'Weight', type: 'select', options: ['300', '400', '500', '600', '700'] },
    { key: 'line-height', label: 'Line Height', type: 'text', placeholder: '1.5' },
    { key: 'align', label: 'Align', type: 'select', options: ['left', 'center', 'right'] },
    { key: 'padding', label: 'Padding', type: 'text', placeholder: '10px 25px' },
  ],
  'mc-image': [
    { key: 'src', label: 'Image URL', type: 'url', placeholder: 'https://...' },
    { key: 'alt', label: 'Alt Text', type: 'text', placeholder: 'Image description' },
    { key: 'width', label: 'Width', type: 'text', placeholder: '600px' },
    { key: 'height', label: 'Height', type: 'text', placeholder: 'auto' },
    { key: 'href', label: 'Link URL', type: 'url', placeholder: 'https://...' },
    { key: 'align', label: 'Align', type: 'select', options: ['left', 'center', 'right'] },
    { key: 'padding', label: 'Padding', type: 'text', placeholder: '10px 25px' },
    { key: 'border-radius', label: 'Border Radius', type: 'text', placeholder: '0px' },
  ],
  'mc-button': [
    { key: 'content', label: 'Label', type: 'text', placeholder: 'Click me' },
    { key: 'href', label: 'Link URL', type: 'url', placeholder: 'https://...' },
    { key: 'background-color', label: 'Background', type: 'color' },
    { key: 'color', label: 'Text Color', type: 'color' },
    { key: 'font-size', label: 'Font Size', type: 'text', placeholder: '14px' },
    { key: 'font-weight', label: 'Weight', type: 'select', options: ['400', '500', '600', '700'] },
    { key: 'font-family', label: 'Font Family', type: 'text', placeholder: 'Arial, sans-serif' },
    { key: 'border-radius', label: 'Border Radius', type: 'text', placeholder: '6px' },
    { key: 'padding', label: 'Outer Padding', type: 'text', placeholder: '10px 25px' },
    { key: 'inner-padding', label: 'Inner Padding', type: 'text', placeholder: '12px 24px' },
    { key: 'align', label: 'Align', type: 'select', options: ['left', 'center', 'right'] },
  ],
  'mc-divider': [
    { key: 'border-color', label: 'Color', type: 'color' },
    { key: 'border-width', label: 'Width', type: 'text', placeholder: '1px' },
    { key: 'border-style', label: 'Style', type: 'select', options: ['solid', 'dashed', 'dotted'] },
    { key: 'padding', label: 'Padding', type: 'text', placeholder: '10px 25px' },
    { key: 'width', label: 'Line Width', type: 'text', placeholder: '100%' },
  ],
  'mc-spacer': [
    { key: 'height', label: 'Height', type: 'text', placeholder: '30px' },
  ],
  'mc-social': [
    { key: 'font-size', label: 'Font Size', type: 'text', placeholder: '12px' },
    { key: 'icon-size', label: 'Icon Size', type: 'text', placeholder: '24px' },
    { key: 'mode', label: 'Mode', type: 'select', options: ['horizontal', 'vertical'] },
    { key: 'align', label: 'Align', type: 'select', options: ['left', 'center', 'right'] },
    { key: 'padding', label: 'Padding', type: 'text', placeholder: '10px 25px' },
  ],
  'mc-hero': [
    { key: 'background-color', label: 'Background', type: 'color' },
    { key: 'background-image', label: 'BG Image URL', type: 'url', placeholder: 'https://...' },
    { key: 'height', label: 'BG Height', type: 'text', placeholder: '300px' },
    { key: 'mode', label: 'Mode', type: 'select', options: ['fluid-height', 'fixed-height'] },
    { key: 'padding', label: 'Padding', type: 'text', placeholder: '40px 0' },
    { key: 'vertical-align', label: 'V-Align', type: 'select', options: ['top', 'middle', 'bottom'] },
  ],
}

export function getLayoutComponents(): ComponentDefinition[] {
  return Object.values(componentRegistry).filter(c => c.category === 'layout')
}

export function getContentComponents(): ComponentDefinition[] {
  return Object.values(componentRegistry).filter(c => c.category === 'content')
}
