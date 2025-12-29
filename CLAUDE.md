# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Payload CMS translation plugin (`payload-translate`) that uses Google Gemini AI to automatically translate localized fields from one locale to another. It adds a "Translate" button to the document edit view of specified collections.

## Commands

```bash
# Development - starts Next.js dev server with Turbopack
pnpm dev

# Testing
pnpm test:int          # Run Vitest integration tests
pnpm test:e2e          # Run Playwright e2e tests
pnpm test              # Run all tests

# Run a single integration test
pnpm test:int -t "test name pattern"

# Build for publishing
pnpm build             # Compiles to dist/ using SWC

# Linting
pnpm lint              # Run ESLint
pnpm lint:fix          # Fix ESLint issues

# Generate Payload types and import map
pnpm generate:types
pnpm generate:importmap
```

## Architecture

### Plugin Entry Point (`src/index.ts`)
The main export `payloadTranslate` is a higher-order function that:
- Accepts plugin config: `apiKey` (Gemini API key) and `collections` (array of collection slugs)
- Stores API key in `config.custom.translateApiKey` for endpoint access
- Injects `TranslateButton` into `beforeDocumentControls` for specified collections
- Registers `/translate` POST endpoint

### Plugin Config
```ts
payloadTranslate({
  apiKey: process.env.GEMINI_API_KEY,
  collections: ['posts', 'pages'],
})
```

### Key Components

**TranslateButton** (`src/components/TranslateButton/index.tsx`)
- Client component injected before document controls
- Renders button and modal for locale selection
- Supports translating to a single locale or all available locales at once
- Calls `/api/translate` endpoint with `targetLocales` array

### Translation Flow

1. User clicks "Translate" button on a document
2. Selects target locale(s) in modal
3. Frontend POSTs to `/api/translate` with `{ collection, documentId, sourceLocale, targetLocales }`
4. Endpoint (`src/endpoints/translateHandler.ts`):
   - Fetches document in source locale
   - Extracts all `localized: true` text/textarea/richText fields via `extractTranslatableFields`
   - Sends texts to Gemini API for batch translation
   - Applies translations via `applyTranslations`
   - Updates document in each target locale

### Export Structure
- `payload-translate` - Main plugin export
- `payload-translate/client` - Client components (TranslateButton)

### Dev Environment (`dev/`)
A minimal Payload app for testing. Uses in-memory MongoDB by default (no external DB needed). Optional `.env`:
- `DATABASE_URI` - MongoDB connection (optional, uses in-memory if not set)
- `PAYLOAD_SECRET` - Payload secret (optional, has default)
- `GEMINI_API_KEY` - Google Gemini API key (required for actual translations)

### Field Support
The plugin extracts and translates:
- `text` fields with `localized: true`
- `textarea` fields with `localized: true`
- `richText` (Lexical) fields with `localized: true` - traverses Lexical tree to translate individual text nodes
- Nested fields in `array`, `group`, `blocks`, and `tabs`
