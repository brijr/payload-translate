import type { GeminiTranslationRequest } from '../types.js'

type TranslateWithGeminiArgs = {
  apiKey: string
} & GeminiTranslationRequest

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function translateWithGemini({
  apiKey,
  sourceLocale,
  targetLocale,
  texts,
}: TranslateWithGeminiArgs): Promise<string[]> {
  if (texts.length === 0) {
    return []
  }

  const prompt = buildTranslationPrompt(texts, sourceLocale, targetLocale)

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.1,
        topP: 0.95,
      },
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const result = await response.json()
  console.log('Gemini response:', JSON.stringify(result, null, 2))

  // Gemini 2.5 may have multiple parts (thinking + response), find the text part
  const parts = result.candidates?.[0]?.content?.parts || []
  const textPart = parts.find((p: { text?: string }) => p.text !== undefined)
  const generatedText = textPart?.text

  if (!generatedText) {
    throw new Error(`No translation returned from Gemini. Response: ${JSON.stringify(result)}`)
  }

  return parseTranslationResponse(generatedText, texts.length)
}

function buildTranslationPrompt(
  texts: string[],
  sourceLocale: string,
  targetLocale: string,
): string {
  const textsJson = JSON.stringify(texts)

  return `You are a professional translator. Translate the following texts from ${sourceLocale} to ${targetLocale}.

IMPORTANT RULES:
1. Maintain the exact same formatting, including HTML tags, markdown, and special characters
2. Do not translate proper nouns, brand names, or code/technical terms unless they have standard translations
3. Preserve any placeholder variables like {{name}} or {0}
4. Return ONLY a valid JSON array with the translations in the same order
5. Each translation should correspond to the input at the same index

Input texts (JSON array):
${textsJson}

Return ONLY the JSON array of translations, nothing else. Example format:
["translated text 1", "translated text 2"]`
}

function parseTranslationResponse(response: string, expectedCount: number): string[] {
  let jsonStr = response.trim()

  // Handle code blocks if present
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  }

  try {
    const translations = JSON.parse(jsonStr)

    if (!Array.isArray(translations)) {
      throw new Error('Response is not an array')
    }

    if (translations.length !== expectedCount) {
      console.warn(`Expected ${expectedCount} translations, got ${translations.length}`)
    }

    return translations
  } catch (_error) {
    console.error('Failed to parse translation response:', response)
    throw new Error('Failed to parse translation response from Gemini')
  }
}
