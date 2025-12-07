import type { Payload } from 'payload'

import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload

afterAll(async () => {
  await payload.destroy()
})

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe('Payload Translate Plugin', () => {
  test('can create post with localized fields', async () => {
    const post = await payload.create({
      collection: 'posts',
      data: {
        excerpt: 'This is a test post',
        title: 'Hello World',
      },
      locale: 'en',
    })
    expect(post.title).toBe('Hello World')
    expect(post.excerpt).toBe('This is a test post')
  })

  test('localization config is present', () => {
    const { localization } = payload.config
    expect(localization).toBeDefined()
    expect(localization?.defaultLocale).toBe('en')
  })

  test('translate endpoint is registered', () => {
    const endpoints = payload.config.endpoints
    const translateEndpoint = endpoints?.find((e) => e.path === '/translate')
    expect(translateEndpoint).toBeDefined()
    expect(translateEndpoint?.method).toBe('post')
  })
})
