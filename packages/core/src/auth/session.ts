/**
 * Session management — 128-bit random tokens, bcrypt-hashed storage.
 *
 * Security:
 * - Token: crypto.randomBytes(16).toString('hex') — NOT uuid()
 * - Stored as bcrypt hash (10 rounds) — never plaintext
 * - 7-day sliding expiry
 * - Constant-time comparison via bcrypt.compare
 */
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import type Database from 'better-sqlite3'

const SALT_ROUNDS = 10
const SESSION_EXPIRY_DAYS = 7

export function ensureSessionTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _forge_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    )
  `)
}

/**
 * Create a new session. Returns the session ID and plaintext token.
 * The token is returned ONCE — it is stored as a bcrypt hash.
 */
export async function createSession(
  db: Database.Database,
  userId: string,
): Promise<{ id: string; token: string }> {
  const id = randomBytes(8).toString('hex')
  const token = randomBytes(16).toString('hex') // 128-bit
  const tokenHash = await bcrypt.hash(token, SALT_ROUNDS)

  const expiresAt = new Date(
    Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()

  db.prepare(
    'INSERT INTO _forge_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
  ).run(id, userId, tokenHash, expiresAt)

  return { id, token }
}

/**
 * Validate a session token. Returns the user ID if valid.
 * Uses bcrypt.compare for constant-time comparison (timing attack resistance).
 *
 * @throws {Error} 'Invalid session' if token is invalid or expired
 */
export async function validateSession(
  db: Database.Database,
  token: string,
): Promise<string> {
  // Get all non-expired sessions
  const rows = db.prepare(
    "SELECT id, user_id, token_hash FROM _forge_sessions WHERE expires_at > datetime('now')",
  ).all() as Array<{ id: string; user_id: string; token_hash: string }>

  for (const row of rows) {
    const isMatch = await bcrypt.compare(token, row.token_hash)
    if (isMatch) {
      return row.user_id
    }
  }

  throw new Error('Invalid session')
}

/**
 * Invalidate (delete) a session by ID.
 */
export function invalidateSession(
  db: Database.Database,
  sessionId: string,
): Promise<void> {
  db.prepare('DELETE FROM _forge_sessions WHERE id = ?').run(sessionId)
  return Promise.resolve()
}
