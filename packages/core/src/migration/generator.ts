/**
 * SQL statement generator — converts SchemaChange[] to SQL strings.
 * SQLite dialect only for now (used in tests). Postgres dialect added in future.
 *
 * No raw string interpolation — all identifiers are sanitized.
 */
import type { SchemaChange } from './types'
import { sanitizeIdentifier } from '../orm/column-map'

/**
 * Generate SQL statements from a list of schema changes.
 * Returns an array of executable SQL strings.
 */
export function generateSQL(changes: readonly SchemaChange[]): string[] {
  const statements: string[] = []

  for (const change of changes) {
    switch (change.type) {
      case 'create_table': {
        const cols = Object.entries(change.columns)
          .map(([name, def]) => {
            const safeName = sanitizeIdentifier(name)
            let col = `${safeName} ${def.sqlType}`
            if (def.notNull) col += ' NOT NULL'
            if (def.primaryKey) col += ' PRIMARY KEY'
            return col
          })
          .join(', ')
        statements.push(
          `CREATE TABLE ${sanitizeIdentifier(change.table)} (${cols})`,
        )
        break
      }

      case 'add_column': {
        const safeTable = sanitizeIdentifier(change.table)
        const safeCol = sanitizeIdentifier(change.column)
        let stmt = `ALTER TABLE ${safeTable} ADD COLUMN ${safeCol} ${change.sqlType}`
        if (change.notNull) {
          stmt += " NOT NULL DEFAULT ''"
        }
        statements.push(stmt)
        break
      }

      case 'alter_column': {
        // SQLite doesn't support ALTER COLUMN directly.
        // For now, generate a comment. Full implementation requires table recreation.
        statements.push(
          `-- ALTER COLUMN: ${sanitizeIdentifier(change.table)}.${sanitizeIdentifier(change.column)} from ${change.from} to ${change.to}`,
        )
        break
      }

      case 'set_not_null':
      case 'drop_not_null': {
        // SQLite doesn't support ALTER COLUMN SET/DROP NOT NULL
        statements.push(
          `-- ${change.type.toUpperCase()}: ${sanitizeIdentifier(change.table)}.${sanitizeIdentifier(change.column)}`,
        )
        break
      }

      case 'drop_column': {
        const safeTable = sanitizeIdentifier(change.table)
        const safeCol = sanitizeIdentifier(change.column)
        statements.push(`ALTER TABLE ${safeTable} DROP COLUMN ${safeCol}`)
        break
      }

      case 'drop_table': {
        statements.push(`DROP TABLE ${sanitizeIdentifier(change.table)}`)
        break
      }

      case 'warn_removed_column':
      case 'warn_removed_table':
        // Warnings — no SQL generated
        break
    }
  }

  return statements
}
