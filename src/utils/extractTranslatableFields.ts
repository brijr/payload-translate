import type { Field } from 'payload'

import type { TranslatableField } from '../types.js'

export function extractTranslatableFields(
  data: Record<string, unknown>,
  fields: Field[],
  basePath: string = '',
): TranslatableField[] {
  const translatableFields: TranslatableField[] = []

  for (const field of fields) {
    // Skip fields without names (like row, collapsible without name)
    if (!('name' in field)) {
      // Handle layout fields that contain nested fields
      if ('fields' in field) {
        const nestedFields = extractTranslatableFields(data, field.fields, basePath)
        translatableFields.push(...nestedFields)
      }
      // Handle tabs
      if ('tabs' in field) {
        for (const tab of field.tabs) {
          if ('fields' in tab) {
            const tabFields = extractTranslatableFields(data, tab.fields, basePath)
            translatableFields.push(...tabFields)
          }
        }
      }
      continue
    }

    const fieldPath = basePath ? `${basePath}.${field.name}` : field.name
    const value = data[field.name]

    // Skip if no value
    if (value === undefined || value === null) {continue}

    // Only process localized fields (UIField doesn't have localized property)
    const isLocalized = 'localized' in field && field.localized
    if (!isLocalized) {
      // But still recurse into nested structures for localized children
      if (field.type === 'group' && 'fields' in field && typeof value === 'object') {
        const groupFields = extractTranslatableFields(
          value as Record<string, unknown>,
          field.fields,
          fieldPath,
        )
        translatableFields.push(...groupFields)
      }
      if (field.type === 'array' && 'fields' in field && Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            const itemFields = extractTranslatableFields(
              item as Record<string, unknown>,
              field.fields,
              `${fieldPath}.${index}`,
            )
            translatableFields.push(...itemFields)
          }
        })
      }
      if (field.type === 'blocks' && 'blocks' in field && Array.isArray(value)) {
        value.forEach((block, index) => {
          if (typeof block === 'object' && block !== null && 'blockType' in block) {
            const blockConfig = field.blocks.find((b) => b.slug === block.blockType)
            if (blockConfig) {
              const blockFields = extractTranslatableFields(
                block as Record<string, unknown>,
                blockConfig.fields,
                `${fieldPath}.${index}`,
              )
              translatableFields.push(...blockFields)
            }
          }
        })
      }
      continue
    }

    // Process localized fields
    switch (field.type) {
      case 'array':
        if ('fields' in field && Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              const itemFields = extractTranslatableFields(
                item as Record<string, unknown>,
                field.fields,
                `${fieldPath}.${index}`,
              )
              translatableFields.push(...itemFields)
            }
          })
        }
        break
      case 'blocks':
        if ('blocks' in field && Array.isArray(value)) {
          value.forEach((block, index) => {
            if (typeof block === 'object' && block !== null && 'blockType' in block) {
              const blockConfig = field.blocks.find((b) => b.slug === block.blockType)
              if (blockConfig) {
                const blockFields = extractTranslatableFields(
                  block as Record<string, unknown>,
                  blockConfig.fields,
                  `${fieldPath}.${index}`,
                )
                translatableFields.push(...blockFields)
              }
            }
          })
        }
        break

      case 'group':
        if ('fields' in field && typeof value === 'object') {
          const groupFields = extractTranslatableFields(
            value as Record<string, unknown>,
            field.fields,
            fieldPath,
          )
          translatableFields.push(...groupFields)
        }
        break

      case 'richText':
        if (value && typeof value === 'object') {
          // Extract each text node individually with its path in the Lexical tree
          const textNodes = extractLexicalTextNodes(value)
          for (const textNode of textNodes) {
            if (textNode.text.trim()) {
              translatableFields.push({
                type: 'richText',
                lexicalPath: textNode.path,
                path: fieldPath,
                value: textNode.text,
              })
            }
          }
        }
        break

      case 'text':
      // falls through
      case 'textarea':
        if (typeof value === 'string' && value.trim()) {
          translatableFields.push({
            type: field.type,
            path: fieldPath,
            value,
          })
        }
        break
    }
  }

  return translatableFields
}

interface LexicalNode {
  [key: string]: unknown
  children?: LexicalNode[]
  text?: string
  type?: string
}

interface LexicalTextNode {
  path: string
  text: string
}

/**
 * Extracts all text nodes from a Lexical editor state with their paths.
 * This allows us to translate each text node individually and apply
 * translations back to the exact same location.
 */
function extractLexicalTextNodes(editorState: unknown): LexicalTextNode[] {
  const textNodes: LexicalTextNode[] = []

  if (!editorState || typeof editorState !== 'object') {
    return textNodes
  }

  const state = editorState as { root?: LexicalNode }
  if (!state.root) {
    return textNodes
  }

  function traverse(node: LexicalNode, currentPath: string, parentType?: string): void {
    if (node.type === 'text' && typeof node.text === 'string') {
      // Skip text nodes inside autolink nodes - these are URLs and shouldn't be translated
      if (parentType === 'autolink') {
        return
      }
      textNodes.push({
        path: currentPath,
        text: node.text,
      })
    }
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child, index) => {
        traverse(child, `${currentPath}.children.${index}`, node.type)
      })
    }
  }

  traverse(state.root, 'root')
  return textNodes
}
