'use client'

import type { Locale } from 'payload'

import {
  Button,
  Modal,
  ReactSelect,
  type ReactSelectOption,
  useConfig,
  useDocumentInfo,
  useLocale,
  useModal,
} from '@payloadcms/ui'
import React, { useCallback, useState } from 'react'
import { toast } from 'sonner'

import './index.scss'

const MODAL_SLUG = 'translate-document-modal'

export const TranslateButton: React.FC = () => {
  const { config } = useConfig()
  const { id, collectionSlug } = useDocumentInfo()
  const locale = useLocale()
  const { closeModal, openModal } = useModal()
  const [isTranslating, setIsTranslating] = useState(false)
  const [selectedLocale, setSelectedLocale] = useState<null | ReactSelectOption>(null)

  // Get available locales (exclude current locale)
  const localization = config.localization
  const locales = localization ? localization.locales : []
  const availableTargetLocales = locales.filter((l: Locale | string) => {
    const code = typeof l === 'string' ? l : l.code
    return code !== locale?.code
  })

  const handleTranslate = useCallback(async () => {
    if (!collectionSlug || !id || !locale?.code || !selectedLocale) {
      return
    }

    setIsTranslating(true)
    closeModal(MODAL_SLUG)

    try {
      const response = await fetch(`${config.serverURL}${config.routes.api}/translate`, {
        body: JSON.stringify({
          collection: collectionSlug,
          documentId: id,
          sourceLocale: locale.code,
          targetLocale: selectedLocale.value,
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
      setSelectedLocale(null)
    }
  }, [closeModal, collectionSlug, config, id, locale, selectedLocale])

  const handleCancel = useCallback(() => {
    setSelectedLocale(null)
    closeModal(MODAL_SLUG)
  }, [closeModal])

  // Don't render if no localization, no other locales, or document not saved yet
  if (!config.localization || availableTargetLocales.length === 0 || !id) {
    return null
  }

  const localeOptions: ReactSelectOption[] = availableTargetLocales.map((l: Locale | string) => {
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
      >
        {isTranslating ? 'Translating...' : 'Translate'}
      </Button>
      <Modal className="translate-modal" slug={MODAL_SLUG}>
        <div className="translate-modal__wrapper">
          <div className="translate-modal__content">
            <h3>Translate Document</h3>
            <p>
              Translate content from <strong>{locale?.code?.toUpperCase()}</strong> to:
            </p>
            <div className="translate-modal__select">
              <ReactSelect
                isClearable
                onChange={(option) => setSelectedLocale(option as ReactSelectOption)}
                options={localeOptions}
                placeholder="Select target locale..."
                value={selectedLocale ?? undefined}
              />
            </div>
          </div>
          <div className="translate-modal__controls">
            <Button buttonStyle="secondary" onClick={handleCancel} size="medium">
              Cancel
            </Button>
            <Button disabled={!selectedLocale} onClick={handleTranslate} size="medium">
              Translate
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
