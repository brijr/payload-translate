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
  targetLocale: string
}

export type TranslateResponse = {
  error?: string
  message?: string
  success: boolean
  translatedFields?: number
}

export type TranslatableField = {
  path: string
  type: 'richText' | 'text' | 'textarea'
  value: string
}

export type GeminiTranslationRequest = {
  sourceLocale: string
  targetLocale: string
  texts: string[]
}
