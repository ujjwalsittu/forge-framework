import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../runner'
import { MigrationHistory } from '../history'
import type { SchemaChange } from '../types'

describe('MigrationHistory', () => {
  let db: Database.Database
  let history: MigrationHistory

  beforeEach(() => {
    db = new Database(':memory:')
    history = new MigrationHistory(db)
    history.ensureTable()
  })

  it('creates _forge_migrations table', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_forge_migrations'")
      .all() as Array<{ name: string }>
    expect(tables).toHaveLength(1)
  })

  it('records and checks migration hash', () => {
    history.record('abc123', 'create table Item')
    expect(history.hasRun('abc123')).toBe(true)
    expect(history.hasRun('xyz789')).toBe(false)
  })

  it('prevents duplicate recording of same hash', () => {
    history.record('abc123', 'create table Item')
    history.record('abc123', 'create table Item') // should be a no-op
    const count = db
      .prepare('SELECT COUNT(*) as cnt FROM _forge_migrations WHERE hash = ?')
      .get('abc123') as { cnt: number }
    expect(count.cnt).toBe(1)
  })
})

describe('runMigrations()', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('applies create_table changes', () => {
    const changes: SchemaChange[] = [
      {
        type: 'create_table',
        table: 'Item',
        columns: {
          id: { sqlType: 'text', notNull: true, primaryKey: true },
          name: { sqlType: 'text', notNull: true, primaryKey: false },
          price: { sqlType: 'text', notNull: false, primaryKey: false },
        },
      },
    ]
    const result = runMigrations(db, changes)
    expect(result.applied).toBe(true)
    expect(result.statementsExecuted).toBeGreaterThan(0)

    // Verify table exists
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Item'")
      .all() as Array<{ name: string }>
    expect(tables).toHaveLength(1)
  })

  it('applies add_column changes', () => {
    // First create the table
    db.exec('CREATE TABLE Item (id TEXT PRIMARY KEY, name TEXT NOT NULL)')
    const changes: SchemaChange[] = [
      { type: 'add_column', table: 'Item', column: 'price', sqlType: 'text', notNull: false },
    ]
    const result = runMigrations(db, changes)
    expect(result.applied).toBe(true)

    // Verify column exists
    const info = db.prepare('PRAGMA table_info(Item)').all() as Array<{ name: string }>
    const colNames = info.map(c => c.name)
    expect(colNames).toContain('price')
  })

  it('executes in a transaction — rolls back on error', () => {
    const changes: SchemaChange[] = [
      {
        type: 'create_table',
        table: 'GoodTable',
        columns: {
          id: { sqlType: 'text', notNull: true, primaryKey: true },
        },
      },
      {
        type: 'add_column',
        table: 'NonExistentTable',
        column: 'bad_col',
        sqlType: 'text',
        notNull: false,
      },
    ]
    expect(() => runMigrations(db, changes)).toThrow()

    // Verify GoodTable was NOT created (rolled back)
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='GoodTable'")
      .all() as Array<{ name: string }>
    expect(tables).toHaveLength(0)
  })

  it('is idempotent — running twice does not re-apply', () => {
    const changes: SchemaChange[] = [
      {
        type: 'create_table',
        table: 'Item',
        columns: {
          id: { sqlType: 'text', notNull: true, primaryKey: true },
        },
      },
    ]
    const result1 = runMigrations(db, changes)
    expect(result1.applied).toBe(true)

    const result2 = runMigrations(db, changes)
    expect(result2.applied).toBe(false) // No-op on second run
    expect(result2.statementsExecuted).toBe(0)
  })

  it('dry-run mode returns SQL without executing', () => {
    const changes: SchemaChange[] = [
      {
        type: 'create_table',
        table: 'Item',
        columns: {
          id: { sqlType: 'text', notNull: true, primaryKey: true },
        },
      },
    ]
    const result = runMigrations(db, changes, { dryRun: true })
    expect(result.applied).toBe(false)
    expect(result.sql.length).toBeGreaterThan(0)
    expect(result.sql[0]).toContain('CREATE TABLE')

    // Verify table was NOT created
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Item'")
      .all() as Array<{ name: string }>
    expect(tables).toHaveLength(0)
  })

  it('prune without confirmSiteName throws error', () => {
    const changes: SchemaChange[] = [
      { type: 'drop_column', table: 'Item', column: 'old_col' },
    ]
    expect(() => runMigrations(db, changes)).toThrow(
      'Drop operations require --prune flag with site name confirmation',
    )
  })

  it('prune with confirmSiteName executes drop', () => {
    db.exec('CREATE TABLE Item (id TEXT PRIMARY KEY, old_col TEXT)')
    const changes: SchemaChange[] = [
      { type: 'drop_column', table: 'Item', column: 'old_col' },
    ]
    const result = runMigrations(db, changes, {
      prune: true,
      confirmSiteName: 'test.local',
      actualSiteName: 'test.local',
    })
    expect(result.applied).toBe(true)
  })

  it('prune with wrong confirmSiteName throws error', () => {
    const changes: SchemaChange[] = [
      { type: 'drop_column', table: 'Item', column: 'old_col' },
    ]
    expect(() =>
      runMigrations(db, changes, {
        prune: true,
        confirmSiteName: 'wrong.local',
        actualSiteName: 'test.local',
      }),
    ).toThrow('Site name confirmation does not match')
  })
})
