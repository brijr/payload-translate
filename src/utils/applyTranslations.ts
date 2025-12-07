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
    if (translation === undefined) {return}

    if (field.type === 'richText') {
      // For rich text, apply translation to the Lexical structure
      try {
        const originalRichText = JSON.parse(field.value) as LexicalState
        const translatedRichText = applyTranslationToLexical(originalRichText, translation)
        setNestedValue(result, field.path, translatedRichText)
      } catch (error) {
        console.error(`Failed to apply rich text translation for ${field.path}:`, error)
      }
    } else {
      // For text/textarea, directly set the translation
      setNestedValue(result, field.path, translation)
    }
  })

  return result
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

interface LexicalNode {
  [key: string]: unknown
  children?: LexicalNode[]
  text?: string
  type?: string
}

interface LexicalState {
  [key: string]: unknown
  root?: LexicalNode
}

function applyTranslationToLexical(editorState: LexicalState, translatedJson: string): LexicalState {
  // The translation should be a JSON array of translated text nodes
  // Try to parse and apply translations in order
  try {
    const translatedTexts = JSON.parse(translatedJson) as string[]
    if (Array.isArray(translatedTexts)) {
      return applyTextsToLexicalNodes(editorState, translatedTexts)
    }
  } catch {
    // If it's not a JSON array, treat the whole thing as a single translation
    // This handles cases where Gemini might return a single translated rich text
  }

  // Fallback: try to parse as a complete Lexical state
  try {
    const translatedState = JSON.parse(translatedJson) as LexicalState
    if (translatedState.root) {
      return translatedState
    }
  } catch {
    // If all parsing fails, return original
    console.warn('Could not parse rich text translation, keeping original')
  }

  return editorState
}

function applyTextsToLexicalNodes(editorState: LexicalState, translatedTexts: string[]): LexicalState {
  // Deep clone the editor state
  const result = JSON.parse(JSON.stringify(editorState)) as LexicalState
  let textIndex = 0

  function traverse(node: LexicalNode): void {
    if (node.type === 'text' && node.text !== undefined && textIndex < translatedTexts.length) {
      node.text = translatedTexts[textIndex]
      textIndex++
    }
    if (node.children) {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }

  if (result.root) {
    traverse(result.root)
  }

  return result
}
