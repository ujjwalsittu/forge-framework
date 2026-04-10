import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createSession, validateSession, invalidateSession, ensureSessionTable } from '../session'

describe('Session security', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    ensureSessionTable(db)
  })

  it('token is 128-bit random hex (not UUID, no dashes)', async () => {
    const session = await createSession(db, 'user-1')
    // 128-bit = 16 bytes = 32 hex chars
    expect(session.token).toMatch(/^[0-9a-f]{32}$/)
    expect(session.token).not.toContain('-')
  })

  it('stored token is bcrypt hash, not plaintext', async () => {
    const session = await createSession(db, 'user-1')
    const row = db
      .prepare('SELECT token_hash FROM _forge_sessions WHERE id = ?')
      .get(session.id) as { token_hash: string } | undefined
    expect(row).toBeDefined()
    expect(row?.token_hash).not.toBe(session.token)
    expect(row?.token_hash).toMatch(/^\$2[aby]\$/)
  })

  it('validates a correct token', async () => {
    const session = await createSession(db, 'user-1')
    const userId = await validateSession(db, session.token)
    expect(userId).toBe('user-1')
  })

  it('rejects an invalid token', async () => {
    await createSession(db, 'user-1')
    await expect(validateSession(db, 'wrong-token')).rejects.toThrow('Invalid session')
  })

  it('rejects expired sessions', async () => {
    const session = await createSession(db, 'user-1')
    // Manually expire the session
    db.prepare("UPDATE _forge_sessions SET expires_at = datetime('now', '-1 day') WHERE id = ?")
      .run(session.id)
    await expect(validateSession(db, session.token)).rejects.toThrow('Invalid session')
  })

  it('invalidateSession removes the session', async () => {
    const session = await createSession(db, 'user-1')
    await invalidateSession(db, session.id)
    await expect(validateSession(db, session.token)).rejects.toThrow('Invalid session')
  })

  it('creates session with 7-day expiry by default', async () => {
    const session = await createSession(db, 'user-1')
    const row = db
      .prepare('SELECT expires_at FROM _forge_sessions WHERE id = ?')
      .get(session.id) as { expires_at: string } | undefined
    expect(row).toBeDefined()
    // Expiry should be ~7 days from now
    const expiry = new Date(row?.expires_at ?? '')
    const now = new Date()
    const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThan(6)
    expect(diffDays).toBeLessThan(8)
  })
})
