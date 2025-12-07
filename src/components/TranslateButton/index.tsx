'use client'

import type { Locale } from 'payload'

import { useConfig, useDocumentInfo, useLocale, useModal } from '@payloadcms/ui'
import React, { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { TranslateModal } from '../TranslateModal/index.js'

const MODAL_SLUG = 'translate-document-modal'

export const TranslateButton: React.FC = () => {
  const { config } = useConfig()
  const { id, collectionSlug } = useDocumentInfo()
  const locale = useLocale()
  const { closeModal, openModal } = useModal()
  const [isTranslating, setIsTranslating] = useState(false)

  // Get available locales (exclude current locale)
  const locales = config.localization?.locales || []
  const availableTargetLocales = locales.filter((l: Locale | string) => {
    const code = typeof l === 'string' ? l : l.code
    return code !== locale?.code
  })

  const handleTranslate = useCallback(
    async (targetLocale: string) => {
      if (!collectionSlug || !id || !locale?.code) {return}

      setIsTranslating(true)
      closeModal(MODAL_SLUG)

      try {
        const response = await fetch(`${config.serverURL}${config.routes.api}/translate`, {
          body: JSON.stringify({
            collection: collectionSlug,
            documentId: id,
            sourceLocale: locale.code,
            targetLocale,
          }),
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        })

        const result = await response.json()

        if (result.success) {
          toast.success(result.message || 'Translation complete')
        } else {
          toast.error(result.error || 'Translation failed')
        }
      } catch (error) {
        toast.error('Translation request failed')
        console.error('Translation error:', error)
      } finally {
        setIsTranslating(false)
      }
    },
    [collectionSlug, id, locale, config, closeModal],
  )

  // Don't render if no localization, no other locales, or document not saved yet
  if (!config.localization || availableTargetLocales.length === 0 || !id) {
    return null
  }

  return (
    <>
      <button
        className="btn btn--style-secondary btn--size-small"
        disabled={isTranslating}
        onClick={() => openModal(MODAL_SLUG)}
        style={{ marginRight: '8px' }}
        type="button"
      >
        {isTranslating ? 'Translating...' : 'Translate'}
      </button>
      <TranslateModal
        currentLocale={locale?.code || ''}
        isTranslating={isTranslating}
        locales={availableTargetLocales}
        onTranslate={handleTranslate}
        slug={MODAL_SLUG}
      />
    </>
  )
}
