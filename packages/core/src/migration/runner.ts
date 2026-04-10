/**
 * Migration runner — applies schema changes to a database within a transaction.
 *
 * CRITICAL: Drop operations require --prune + site name confirmation.
 * All changes are executed in a single transaction (rolls back on any error).
 * Idempotent: uses _forge_migrations history to skip already-applied migrations.
 */
import type Database from 'better-sqlite3'
import type { MigrationResult, MigrationRunOptions, SchemaChange } from './types'
import { generateSQL } from './generator'
import { hashStatements, MigrationHistory } from './history'

/**
 * Apply schema changes to the database.
 *
 * @throws if drop operations are present without prune + confirmSiteName
 * @throws if confirmSiteName doesn't match actualSiteName
 * @throws if any SQL statement fails (transaction is rolled back)
 */
export function runMigrations(
  db: Database.Database,
  changes: readonly SchemaChange[],
  options?: MigrationRunOptions,
): MigrationResult {
  const dryRun = options?.dryRun === true
  const prune = options?.prune === true
  const warnings: string[] = []

  // Check for drop operations that need confirmation
  const hasDrops = changes.some(
    c => c.type === 'drop_column' || c.type === 'drop_table',
  )
  if (hasDrops && !prune) {
    throw new Error(
      'Drop operations require --prune flag with site name confirmation',
    )
  }
  if (hasDrops && prune) {
    if (!options.confirmSiteName || !options.actualSiteName) {
      throw new Error(
        'Drop operations require --prune flag with site name confirmation',
      )
    }
    if (options.confirmSiteName !== options.actualSiteName) {
      throw new Error(
        `Site name confirmation does not match. Expected "${options.actualSiteName}", got "${options.confirmSiteName}"`,
      )
    }
  }

  // Collect warnings
  for (const change of changes) {
    if (change.type === 'warn_removed_column') {
      warnings.push(
        `WARNING: Column "${change.column}" removed from "${change.table}" schema but not dropped from DB. Use --prune to drop.`,
      )
    }
    if (change.type === 'warn_removed_table') {
      warnings.push(
        `WARNING: Table "${change.table}" removed from schema but not dropped from DB. Use --prune to drop.`,
      )
    }
  }

  // Generate SQL
  const sql = generateSQL(changes)

  if (sql.length === 0) {
    return { applied: false, statementsExecuted: 0, sql: [], warnings }
  }

  // Check idempotency
  const history = new MigrationHistory(db)
  history.ensureTable()
  const hash = hashStatements(sql)

  if (history.hasRun(hash)) {
    return { applied: false, statementsExecuted: 0, sql, warnings }
  }

  // Dry run — return SQL without executing
  if (dryRun) {
    return { applied: false, statementsExecuted: 0, sql, warnings }
  }

  // Execute in transaction
  const transaction = db.transaction(() => {
    let executed = 0
    for (const stmt of sql) {
      // Skip comments
      if (stmt.startsWith('--')) continue
      db.exec(stmt)
      executed++
    }
    history.record(hash, sql.join(';\n'))
    return executed
  })

  const statementsExecuted = transaction()

  return { applied: true, statementsExecuted, sql, warnings }
}
