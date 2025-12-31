import type { PayloadHandler } from 'payload'

import type { TranslateRequestBody, TranslateResponse } from '../types.js'

import { translateWithGemini } from '../services/gemini.js'
import { applyTranslations } from '../utils/applyTranslations.js'
import { extractTranslatableFields } from '../utils/extractTranslatableFields.js'

export const translateHandler: PayloadHandler = async (req) => {
  try {
    const { payload, user } = req

    // Check authentication
    if (!user) {
      return Response.json({ error: 'Unauthorized', success: false } as TranslateResponse, {
        status: 401,
      })
    }

    // Parse request body
    const body = (await req.json?.()) as TranslateRequestBody | undefined
    if (!body) {
      return Response.json(
        { error: 'Invalid request body', success: false } as TranslateResponse,
        { status: 400 },
      )
    }
    const { collection, documentId, sourceLocale, targetLocales } = body

    // Validate request
    if (!collection || !documentId || !sourceLocale || !targetLocales || targetLocales.length === 0) {
      return Response.json(
        { error: 'Missing required fields', success: false } as TranslateResponse,
        { status: 400 },
      )
    }

    // Get API key from config
    const apiKey = (payload.config.custom as Record<string, unknown>)?.translateApiKey as
      | string
      | undefined
    if (!apiKey) {
      return Response.json(
        { error: 'Translation API key not configured', success: false } as TranslateResponse,
        { status: 500 },
      )
    }

    // Fetch document in source locale
    const document = await payload.findByID({
      id: documentId,
      collection,
      depth: 0,
      locale: sourceLocale,
    })

    if (!document) {
      return Response.json({ error: 'Document not found', success: false } as TranslateResponse, {
        status: 404,
      })
    }

    // Get collection config to find localized fields
    const collectionConfig = payload.collections[collection]?.config
    if (!collectionConfig) {
      return Response.json({ error: 'Collection not found', success: false } as TranslateResponse, {
        status: 404,
      })
    }

    // Extract translatable fields
    const translatableFields = extractTranslatableFields(
      document as Record<string, unknown>,
      collectionConfig.fields,
    )

    if (translatableFields.length === 0) {
      return Response.json({
        message: 'No translatable fields found',
        success: true,
        translatedFields: 0,
        translatedLocales: 0,
      } as TranslateResponse)
    }

    // Prepare texts for translation
    const texts = translatableFields.map((f) => f.value)

    // Translate to each target locale
    for (const targetLocale of targetLocales) {
      // Translate with Gemini
      const translations = await translateWithGemini({
        apiKey,
        sourceLocale,
        targetLocale,
        texts,
      })

      // Apply translations to document
      const updatedData = applyTranslations(
        document as Record<string, unknown>,
        translatableFields,
        translations,
      )

      // Remove all system/immutable fields recursively
      const dataToUpdate = removeSystemFields(updatedData)

      // Update document in target locale
      await payload.update({
        id: documentId,
        collection,
        data: dataToUpdate,
        locale: targetLocale,
      })
    }

    return Response.json({
      message: `Successfully translated ${translatableFields.length} field(s) to ${targetLocales.length} locale(s)`,
      success: true,
      translatedFields: translatableFields.length,
      translatedLocales: targetLocales.length,
    } as TranslateResponse)
  } catch (error) {
    console.error('Translation error:', error)
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Translation failed',
        success: false,
      } as TranslateResponse,
      { status: 500 },
    )
  }
}

/**
 * Check if an object looks like a Lexical editor state (has root with children)
 */
function isLexicalState(obj: Record<string, unknown>): boolean {
  return (
    'root' in obj &&
    typeof obj.root === 'object' &&
    obj.root !== null &&
    'children' in (obj.root as Record<string, unknown>)
  )
}

/**
 * Recursively removes system fields (id, createdAt, updatedAt) from an object.
 * Preserves Lexical rich text structures intact since they need their internal IDs.
 */
function removeSystemFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    // Skip Payload system fields at any level
    if (key === 'createdAt' || key === 'updatedAt') {
      continue
    }

    // Skip 'id' only at top level (document ID), not within nested structures
    if (key === 'id' && !('type' in obj)) {
      continue
    }

    if (Array.isArray(value)) {
      // Process array items
      result[key] = value.map((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          return removeSystemFields(item as Record<string, unknown>)
        }
        return item
      })
    } else if (value && typeof value === 'object') {
      // Preserve Lexical editor state structures intact
      if (isLexicalState(value as Record<string, unknown>)) {
        result[key] = value
      } else {
        // Recursively process nested objects
        result[key] = removeSystemFields(value as Record<string, unknown>)
      }
    } else {
      result[key] = value
    }
  }

  return result
}
