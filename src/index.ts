import type { Config } from 'payload'

import type { PayloadTranslateConfig } from './types.js'

import { translateHandler } from './endpoints/translateHandler.js'

export type { PayloadTranslateConfig }

export const payloadTranslate =
  (pluginOptions: PayloadTranslateConfig) =>
  (config: Config): Config => {
    if (pluginOptions.disabled) {
      return config
    }

    // Store API key in custom config for endpoint access
    if (!config.custom) {
      config.custom = {}
    }
    ;(config.custom as Record<string, unknown>).translateApiKey = pluginOptions.apiKey

    // Add TranslateButton to specified collections
    if (!config.collections) {
      config.collections = []
    }

    for (const collectionSlug of pluginOptions.collections) {
      const collection = config.collections.find((c) => c.slug === collectionSlug)

      if (collection) {
        if (!collection.admin) {
          collection.admin = {}
        }
        if (!collection.admin.components) {
          collection.admin.components = {}
        }
        if (!collection.admin.components.edit) {
          collection.admin.components.edit = {}
        }
        if (!collection.admin.components.edit.beforeDocumentControls) {
          collection.admin.components.edit.beforeDocumentControls = []
        }

        collection.admin.components.edit.beforeDocumentControls.push(
          'payload-translate/client#TranslateButton',
        )
      }
    }

    // Register translation endpoint
    if (!config.endpoints) {
      config.endpoints = []
    }

    config.endpoints.push({
      handler: translateHandler,
      method: 'post',
      path: '/translate',
    })

    return config
  }
