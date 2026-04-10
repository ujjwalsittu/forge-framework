/**
 * Migration history — tracks which migrations have been applied.
 * Uses a _forge_migrations table to prevent re-running the same migration.
 */
import type Database from 'better-sqlite3'
import { createHash } from 'crypto'

export class MigrationHistory {
  private readonly db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  /**
   * Create the _forge_migrations table if it doesn't exist.
   */
  ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _forge_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL UNIQUE,
        sql_text TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
  }

  /**
   * Check if a migration with the given hash has already been applied.
   */
  hasRun(hash: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM _forge_migrations WHERE hash = ?')
      .get(hash) as { 1: number } | undefined
    return row !== undefined
  }

  /**
   * Record a migration as applied. Skips if hash already exists.
   */
  record(hash: string, sqlText: string): void {
    this.db
      .prepare(
        'INSERT OR IGNORE INTO _forge_migrations (hash, sql_text) VALUES (?, ?)',
      )
      .run(hash, sqlText)
  }
}

/**
 * Generate a deterministic hash for a set of SQL statements.
 */
export function hashStatements(statements: readonly string[]): string {
  const hash = createHash('sha256')
  for (const stmt of statements) {
    hash.update(stmt)
  }
  return hash.digest('hex').slice(0, 16)
}
