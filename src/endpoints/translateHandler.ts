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
    const { collection, documentId, sourceLocale, targetLocale } = body

    // Validate request
    if (!collection || !documentId || !sourceLocale || !targetLocale) {
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
      } as TranslateResponse)
    }

    // Prepare texts for translation
    const texts = translatableFields.map((f) => f.value)

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

    // Update document in target locale
    await payload.update({
      id: documentId,
      collection,
      data: updatedData,
      locale: targetLocale,
    })

    return Response.json({
      message: `Successfully translated ${translatableFields.length} field(s)`,
      success: true,
      translatedFields: translatableFields.length,
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
