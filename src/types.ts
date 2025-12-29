import type { CollectionSlug } from 'payload'

export type PayloadTranslateConfig = {
  /**
   * Google Gemini API key for translations
   */
  apiKey: string
  /**
   * List of collection slugs to enable translation for
   */
  collections: CollectionSlug[]
  /**
   * Whether the plugin is disabled
   */
  disabled?: boolean
}

export type TranslateRequestBody = {
  collection: string
  documentId: number | string
  sourceLocale: string
  targetLocales: string[]
}

export type TranslateResponse = {
  error?: string
  message?: string
  success: boolean
  translatedFields?: number
  translatedLocales?: number
}

export type TranslatableField = {
  /**
   * For richText fields, the path within the Lexical structure to the text node
   * e.g., "root.children.0.children.1"
   */
  lexicalPath?: string
  path: string
  type: 'richText' | 'text' | 'textarea'
  value: string
}

export type GeminiTranslationRequest = {
  sourceLocale: string
  targetLocale: string
  texts: string[]
}
