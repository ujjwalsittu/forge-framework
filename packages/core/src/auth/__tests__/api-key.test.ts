import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createApiKey, validateApiKey, ensureApiKeyTable } from '../api-key'

describe('API key security', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    ensureApiKeyTable(db)
  })

  it('returns key only once at creation', async () => {
    const { key, id } = await createApiKey(db, 'user-1', 'read-write')
    expect(key).toBeTruthy()
    expect(key.length).toBeGreaterThan(0)

    // Verify stored hash is not the plaintext key
    const row = db.prepare('SELECT key_hash FROM _forge_api_keys WHERE id = ?')
      .get(id) as { key_hash: string } | undefined
    expect(row?.key_hash).not.toBe(key)
    expect(row?.key_hash).toMatch(/^\$2[aby]\$/)
  })

  it('validates a correct API key', async () => {
    const { key } = await createApiKey(db, 'user-1', 'read-write')
    const result = await validateApiKey(db, key)
    expect(result.userId).toBe('user-1')
    expect(result.scope).toBe('read-write')
  })

  it('rejects an invalid API key', async () => {
    await createApiKey(db, 'user-1', 'read-write')
    await expect(validateApiKey(db, 'wrong-key')).rejects.toThrow('Invalid API key')
  })

  it('enforces scope: read-only key cannot write', async () => {
    const { key } = await createApiKey(db, 'user-1', 'read')
    const result = await validateApiKey(db, key)
    expect(result.scope).toBe('read')
  })

  it('tracks last_used_at on validation', async () => {
    const { key, id } = await createApiKey(db, 'user-1', 'read-write')
    await validateApiKey(db, key)

    const row = db.prepare('SELECT last_used_at FROM _forge_api_keys WHERE id = ?')
      .get(id) as { last_used_at: string | null } | undefined
    expect(row?.last_used_at).toBeTruthy()
  })
})
