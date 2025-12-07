import type { TranslatableField } from '../types.js'

export function applyTranslations(
  originalData: Record<string, unknown>,
  fields: TranslatableField[],
  translations: string[],
): Record<string, unknown> {
  // Deep clone the original data
  const result = JSON.parse(JSON.stringify(originalData)) as Record<string, unknown>

  fields.forEach((field, index) => {
    const translation = translations[index]
    if (translation === undefined) {
      return
    }

    if (field.type === 'richText' && field.lexicalPath) {
      // For rich text, apply translation to the specific text node in the Lexical structure
      applyLexicalTranslation(result, field.path, field.lexicalPath, translation)
    } else {
      // For text/textarea, directly set the translation
      setNestedValue(result, field.path, translation)
    }
  })

  return result
}

/**
 * Apply a translation to a specific text node within a Lexical rich text field.
 * @param data - The document data object
 * @param fieldPath - Path to the rich text field (e.g., "content")
 * @param lexicalPath - Path within the Lexical structure (e.g., "root.children.0.children.1")
 * @param translation - The translated text
 */
function applyLexicalTranslation(
  data: Record<string, unknown>,
  fieldPath: string,
  lexicalPath: string,
  translation: string,
): void {
  // Get the Lexical editor state object
  const lexicalState = getNestedValue(data, fieldPath)
  if (!lexicalState || typeof lexicalState !== 'object') {
    return
  }

  // Navigate to the text node and update its text property
  const pathParts = lexicalPath.split('.')
  let current: unknown = lexicalState

  for (let i = 0; i < pathParts.length; i++) {
    const key = pathParts[i]
    if (current && typeof current === 'object' && key in current) {
      if (i === pathParts.length - 1) {
        // We're at the text node, update the text property
        ;(current as Record<string, unknown>)[key] = current[key as keyof typeof current]
      }
      current = (current as Record<string, unknown>)[key]
    } else {
      return // Path not found
    }
  }

  // current should now be the text node
  if (current && typeof current === 'object' && 'text' in current) {
    ;(current as Record<string, unknown>).text = translation
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }

  return current
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  let current: Record<string, unknown> = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const nextKey = keys[i + 1]

    if (!(key in current)) {
      // Create array or object based on next key
      current[key] = isNaN(Number(nextKey)) ? {} : []
    }

    current = current[key] as Record<string, unknown>
  }

  current[keys[keys.length - 1]] = value
}
