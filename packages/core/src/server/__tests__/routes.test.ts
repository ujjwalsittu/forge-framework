import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp } from '../app'
import type { FastifyInstance } from 'fastify'
import { defineSchema } from '../../schema/define'
import { SchemaRegistry } from '../../schema/registry'

const testSchema = defineSchema({
  name: 'TestDoc',
  module: '@test',
  label: 'Test Document',
  titleField: 'title',
  naming: { type: 'autoincrement' },
  fields: [
    { name: 'title', type: 'Data', required: true },
    { name: 'amount', type: 'Currency' },
    { name: 'status', type: 'Select', options: ['Draft', 'Active'] },
  ],
  permissions: [
    { role: 'Administrator', read: true, write: true, create: true, delete: true },
    { role: 'Viewer', read: true },
  ],
})

describe('Auto-generated REST routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    const registry = new SchemaRegistry()
    registry.register(testSchema)
    app = await createTestApp(registry)
  })

  it('GET /api/resource/TestDoc returns paginated list envelope', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/resource/TestDoc',
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body) as Record<string, unknown>
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('page')
    expect(Array.isArray(body['data'])).toBe(true)
  })

  it('POST /api/resource/TestDoc creates a document and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/resource/TestDoc',
      payload: { title: 'Hello' },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body) as Record<string, unknown>
    const data = body['data'] as Record<string, unknown>
    expect(data['title']).toBe('Hello')
  })

  it('GET /api/resource/TestDoc/:name returns single doc', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/resource/TestDoc',
      payload: { title: 'FindMe' },
    })
    const createBody = JSON.parse(createRes.body) as Record<string, unknown>
    const created = createBody['data'] as Record<string, unknown>
    const name = created['name'] as string

    const res = await app.inject({
      method: 'GET',
      url: `/api/resource/TestDoc/${name}`,
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body) as Record<string, unknown>
    const data = body['data'] as Record<string, unknown>
    expect(data['title']).toBe('FindMe')
  })

  it('PUT /api/resource/TestDoc/:name updates document', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/resource/TestDoc',
      payload: { title: 'Original' },
    })
    const createBody = JSON.parse(createRes.body) as Record<string, unknown>
    const created = createBody['data'] as Record<string, unknown>
    const name = created['name'] as string

    const res = await app.inject({
      method: 'PUT',
      url: `/api/resource/TestDoc/${name}`,
      payload: { title: 'Updated' },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body) as Record<string, unknown>
    const data = body['data'] as Record<string, unknown>
    expect(data['title']).toBe('Updated')
  })

  it('DELETE /api/resource/TestDoc/:name returns 200', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/resource/TestDoc',
      payload: { title: 'ToDelete' },
    })
    const createBody = JSON.parse(createRes.body) as Record<string, unknown>
    const created = createBody['data'] as Record<string, unknown>
    const name = created['name'] as string

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/resource/TestDoc/${name}`,
    })
    expect(res.statusCode).toBe(200)
  })

  it('returns 404 for non-existent schematype', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/resource/NonExistent',
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 404 for non-existent document', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/resource/TestDoc/nonexistent-name',
    })
    expect(res.statusCode).toBe(404)
  })

  it('response body matches { data, message? } envelope', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/resource/TestDoc',
    })
    const body = JSON.parse(res.body) as Record<string, unknown>
    expect(body).toHaveProperty('data')
    expect(body).not.toHaveProperty('stack')
  })

  it('error responses never contain stack traces', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/resource/TestDoc/nonexistent',
    })
    const body = JSON.parse(res.body) as Record<string, unknown>
    expect(body).not.toHaveProperty('stack')
    expect(body).toHaveProperty('message')
  })
})

describe('Security headers', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    const registry = new SchemaRegistry()
    app = await createTestApp(registry)
  })

  it('sets security headers via helmet', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/resource/TestDoc' })
    const headers = res.headers as Record<string, string>
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
  })

  it('request body size is limited', async () => {
    const largePayload = { data: 'x'.repeat(11 * 1024 * 1024) }
    const res = await app.inject({
      method: 'POST',
      url: '/api/resource/TestDoc',
      payload: largePayload,
    })
    expect(res.statusCode).toBe(413)
  })
})
