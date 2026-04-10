/**
 * Schema differ — compares two database snapshots and produces a list of changes.
 *
 * CRITICAL CONSTRAINT: Never generates drop_column or drop_table unless prune=true.
 * Removed columns/tables generate warnings instead.
 */
import type { DatabaseSnapshot, DiffOptions, SchemaChange } from './types'

/**
 * Compare two database snapshots and return the list of changes needed
 * to transform `current` into `target`.
 *
 * By default, removed columns/tables produce warnings, NOT drops.
 * Pass `{ prune: true }` to generate actual drop statements.
 */
export function diffSchemas(
  current: DatabaseSnapshot,
  target: DatabaseSnapshot,
  options?: DiffOptions,
): SchemaChange[] {
  const changes: SchemaChange[] = []
  const prune = options?.prune === true

  // 1. Detect new tables
  for (const [tableName, tableDef] of Object.entries(target.tables)) {
    if (!(tableName in current.tables)) {
      const columns: Record<string, { sqlType: string; notNull: boolean; primaryKey: boolean }> = {}
      for (const [colName, colDef] of Object.entries(tableDef.columns)) {
        columns[colName] = {
          sqlType: colDef.sqlType,
          notNull: colDef.notNull,
          primaryKey: false,
        }
      }
      changes.push({ type: 'create_table', table: tableName, columns })
      continue
    }

    // 2. Table exists in both — compare columns
    const currentTable = current.tables[tableName]
    if (!currentTable) continue

    // 2a. New or changed columns
    for (const [colName, targetCol] of Object.entries(tableDef.columns)) {
      const currentCol = currentTable.columns[colName]

      if (!currentCol) {
        // New column
        changes.push({
          type: 'add_column',
          table: tableName,
          column: colName,
          sqlType: targetCol.sqlType,
          notNull: targetCol.notNull,
        })
        continue
      }

      // Type changed
      if (currentCol.sqlType !== targetCol.sqlType) {
        changes.push({
          type: 'alter_column',
          table: tableName,
          column: colName,
          from: currentCol.sqlType,
          to: targetCol.sqlType,
        })
      }

      // NOT NULL changed
      if (!currentCol.notNull && targetCol.notNull) {
        changes.push({ type: 'set_not_null', table: tableName, column: colName })
      } else if (currentCol.notNull && !targetCol.notNull) {
        changes.push({ type: 'drop_not_null', table: tableName, column: colName })
      }
    }

    // 2b. Removed columns
    for (const colName of Object.keys(currentTable.columns)) {
      if (!(colName in tableDef.columns)) {
        if (prune) {
          changes.push({ type: 'drop_column', table: tableName, column: colName })
        } else {
          changes.push({ type: 'warn_removed_column', table: tableName, column: colName })
        }
      }
    }
  }

  // 3. Removed tables
  for (const tableName of Object.keys(current.tables)) {
    if (!(tableName in target.tables)) {
      if (prune) {
        changes.push({ type: 'drop_table', table: tableName })
      } else {
        changes.push({ type: 'warn_removed_table', table: tableName })
      }
    }
  }

  return changes
}
