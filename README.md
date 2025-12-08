# payload-translate

AI-powered translation plugin for Payload CMS using Google Gemini.

## Installation

```bash
pnpm add payload-translate
# or
npm install payload-translate
```

## Setup

```ts
import { buildConfig } from 'payload'
import { payloadTranslate } from 'payload-translate'

export default buildConfig({
  plugins: [
    payloadTranslate({
      apiKey: process.env.GEMINI_API_KEY,
      collections: ['posts', 'pages'],
    }),
  ],
  localization: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr'],
  },
})
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `apiKey` | `string` | Yes | Google Gemini API key |
| `collections` | `string[]` | Yes | Collection slugs to enable translation |
| `disabled` | `boolean` | No | Disable the plugin |

## How It Works

1. Open any document in an enabled collection
2. Click the **Translate** button
3. Select target locale
4. Content is translated via Gemini and saved

## Supported Fields

- Text fields
- Textarea fields
- Rich text (Lexical) - preserves formatting

## Requirements

- Payload 3.x
- Localization enabled in Payload config
- Google Gemini API key

## License

MIT
