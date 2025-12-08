'use client'

import type { Locale } from 'payload'

import { Button, ConfirmationModal, useConfig, useDocumentInfo, useLocale, useModal } from '@payloadcms/ui'
import React, { useCallback, useState } from 'react'
import { toast } from 'sonner'

const MODAL_SLUG = 'translate-document-modal'

export const TranslateButton: React.FC = () => {
  const { config } = useConfig()
  const { id, collectionSlug } = useDocumentInfo()
  const locale = useLocale()
  const { openModal } = useModal()
  const [isTranslating, setIsTranslating] = useState(false)
  const [selectedLocale, setSelectedLocale] = useState<string>('')

  // Get available locales (exclude current locale)
  const locales = config.localization?.locales || []
  const availableTargetLocales = locales.filter((l: Locale | string) => {
    const code = typeof l === 'string' ? l : l.code
    return code !== locale?.code
  })

  const handleTranslate = useCallback(async () => {
    if (!collectionSlug || !id || !locale?.code || !selectedLocale) {
      return
    }

    setIsTranslating(true)

    try {
      const response = await fetch(`${config.serverURL}${config.routes.api}/translate`, {
        body: JSON.stringify({
          collection: collectionSlug,
          documentId: id,
          sourceLocale: locale.code,
          targetLocale: selectedLocale,
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
      setSelectedLocale('')
    }
  }, [collectionSlug, id, locale, selectedLocale, config])

  const handleCancel = useCallback(() => {
    setSelectedLocale('')
  }, [])

  // Don't render if no localization, no other locales, or document not saved yet
  if (!config.localization || availableTargetLocales.length === 0 || !id) {
    return null
  }

  const localeOptions = availableTargetLocales.map((l: Locale | string) => {
    if (typeof l === 'string') {
      return { label: l.toUpperCase(), value: l }
    }
    return {
      label: typeof l.label === 'string' ? l.label : l.code.toUpperCase(),
      value: l.code,
    }
  })

  return (
    <>
      <Button
        buttonStyle="secondary"
        disabled={isTranslating}
        onClick={() => openModal(MODAL_SLUG)}
        size="small"
      >
        {isTranslating ? 'Translating...' : 'Translate'}
      </Button>
      <ConfirmationModal
        body={
          <>
            Translate content from <strong>{locale?.code?.toUpperCase()}</strong> to:{' '}
            <select
              onChange={(e) => setSelectedLocale(e.target.value)}
              style={{
                backgroundColor: 'var(--theme-elevation-0)',
                border: '1px solid var(--theme-elevation-150)',
                borderRadius: '4px',
                color: 'var(--theme-elevation-1000)',
                cursor: 'pointer',
                fontSize: '1rem',
                marginTop: '8px',
                padding: '8px 12px',
              }}
              value={selectedLocale}
            >
              <option value="">Select locale...</option>
              {localeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </>
        }
        confirmingLabel="Translating..."
        confirmLabel={isTranslating ? 'Translating...' : 'Translate'}
        heading="Translate Document"
        modalSlug={MODAL_SLUG}
        onCancel={handleCancel}
        onConfirm={handleTranslate}
      />
    </>
  )
}
