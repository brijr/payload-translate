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

    // Only process localized fields
    if (!field.localized) {
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
        if (value && typeof value === 'object' && hasLexicalContent(value)) {
          // For rich text, we extract individual text nodes
          const richTextTexts = extractLexicalTexts(value)
          if (richTextTexts.length > 0) {
            // Store the serialized rich text for translation
            translatableFields.push({
              type: 'richText',
              path: fieldPath,
              value: JSON.stringify(value),
            })
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

function extractLexicalTexts(editorState: unknown): string[] {
  const texts: string[] = []

  if (!editorState || typeof editorState !== 'object') {
    return texts
  }

  const state = editorState as { root?: LexicalNode }
  if (!state.root?.children) {
    return texts
  }

  function traverse(node: LexicalNode) {
    if (node.type === 'text' && node.text) {
      texts.push(node.text)
    }
    if (node.children) {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }

  traverse(state.root)
  return texts
}

function hasLexicalContent(editorState: unknown): boolean {
  const texts = extractLexicalTexts(editorState)
  return texts.some((text) => text.trim().length > 0)
}
