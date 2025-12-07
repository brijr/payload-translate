'use client'

import type { Locale } from 'payload'

import { Modal, useModal } from '@payloadcms/ui'
import React, { useState } from 'react'

import styles from './index.module.css'

type Props = {
  currentLocale: string
  isTranslating: boolean
  locales: (Locale | string)[]
  onTranslate: (targetLocale: string) => void
  slug: string
}

export const TranslateModal: React.FC<Props> = ({
  slug,
  currentLocale,
  isTranslating,
  locales,
  onTranslate,
}) => {
  const { closeModal } = useModal()
  const [selectedLocale, setSelectedLocale] = useState<string>('')

  const localeOptions = locales.map((locale) => {
    if (typeof locale === 'string') {
      return { label: locale.toUpperCase(), value: locale }
    }
    return {
      label: typeof locale.label === 'string' ? locale.label : locale.code.toUpperCase(),
      value: locale.code,
    }
  })

  const handleConfirm = () => {
    if (selectedLocale) {
      onTranslate(selectedLocale)
      setSelectedLocale('')
    }
  }

  const handleClose = () => {
    closeModal(slug)
    setSelectedLocale('')
  }

  return (
    <Modal className={styles.modal} slug={slug}>
      <div className={styles.content}>
        <h2 className={styles.title}>Translate Document</h2>
        <p className={styles.description}>
          Translate content from <strong>{currentLocale.toUpperCase()}</strong> to:
        </p>
        <div className={styles.selectWrapper}>
          <select
            className={styles.select}
            onChange={(e) => setSelectedLocale(e.target.value)}
            value={selectedLocale}
          >
            <option value="">Select target locale...</option>
            {localeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.actions}>
          <button
            className="btn btn--style-secondary btn--size-medium"
            disabled={isTranslating}
            onClick={handleClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="btn btn--style-primary btn--size-medium"
            disabled={!selectedLocale || isTranslating}
            onClick={handleConfirm}
            type="button"
          >
            {isTranslating ? 'Translating...' : 'Translate'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
