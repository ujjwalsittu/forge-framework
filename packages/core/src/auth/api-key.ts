/**
 * API key management — bcrypt-hashed, never stored or returned plaintext.
 *
 * Security:
 * - Key returned ONCE at creation, then never again
 * - Stored as bcrypt hash (10 rounds)
 * - Scoped: read, read-write, or full
 * - last_used_at tracked on each validation
 */
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import type Database from 'better-sqlite3'

const SALT_ROUNDS = 10

export type ApiKeyScope = 'read' | 'read-write' | 'full'

export function ensureApiKeyTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _forge_api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'read',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT
    )
  `)
}

/**
 * Create a new API key. Returns the key ONCE — subsequent reads return only the prefix.
 */
export async function createApiKey(
  db: Database.Database,
  userId: string,
  scope: ApiKeyScope,
): Promise<{ id: string; key: string }> {
  const id = randomBytes(8).toString('hex')
  const key = `forge_${randomBytes(24).toString('hex')}`
  const keyHash = await bcrypt.hash(key, SALT_ROUNDS)
  const keyPrefix = key.slice(0, 12) // Store prefix for identification

  db.prepare(
    'INSERT INTO _forge_api_keys (id, user_id, key_hash, key_prefix, scope) VALUES (?, ?, ?, ?, ?)',
  ).run(id, userId, keyHash, keyPrefix, scope)

  return { id, key }
}

/**
 * Validate an API key. Returns user ID and scope if valid.
 * Uses bcrypt.compare for constant-time comparison.
 *
 * @throws {Error} 'Invalid API key' if key is invalid
 */
export async function validateApiKey(
  db: Database.Database,
  key: string,
): Promise<{ userId: string; scope: ApiKeyScope }> {
  const rows = db.prepare(
    'SELECT id, user_id, key_hash, scope FROM _forge_api_keys',
  ).all() as Array<{ id: string; user_id: string; key_hash: string; scope: ApiKeyScope }>

  for (const row of rows) {
    const isMatch = await bcrypt.compare(key, row.key_hash)
    if (isMatch) {
      // Update last_used_at
      db.prepare(
        "UPDATE _forge_api_keys SET last_used_at = datetime('now') WHERE id = ?",
      ).run(row.id)
      return { userId: row.user_id, scope: row.scope }
    }
  }

  throw new Error('Invalid API key')
}
