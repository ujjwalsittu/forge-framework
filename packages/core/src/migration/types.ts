/**
 * Migration system type definitions.
 */

export interface ColumnSnapshot {
  readonly sqlType: string
  readonly notNull: boolean
}

export interface TableSnapshot {
  readonly columns: Readonly<Record<string, ColumnSnapshot>>
}

export interface DatabaseSnapshot {
  readonly tables: Readonly<Record<string, TableSnapshot>>
}

export type SchemaChange =
  | CreateTableChange
  | AddColumnChange
  | AlterColumnChange
  | SetNotNullChange
  | DropNotNullChange
  | DropColumnChange
  | DropTableChange
  | WarnRemovedColumnChange
  | WarnRemovedTableChange

export interface CreateTableChange {
  readonly type: 'create_table'
  readonly table: string
  readonly columns: Readonly<Record<string, { sqlType: string; notNull: boolean; primaryKey: boolean }>>
}

export interface AddColumnChange {
  readonly type: 'add_column'
  readonly table: string
  readonly column: string
  readonly sqlType: string
  readonly notNull: boolean
}

export interface AlterColumnChange {
  readonly type: 'alter_column'
  readonly table: string
  readonly column: string
  readonly from: string
  readonly to: string
}

export interface SetNotNullChange {
  readonly type: 'set_not_null'
  readonly table: string
  readonly column: string
}

export interface DropNotNullChange {
  readonly type: 'drop_not_null'
  readonly table: string
  readonly column: string
}

export interface DropColumnChange {
  readonly type: 'drop_column'
  readonly table: string
  readonly column: string
}

export interface DropTableChange {
  readonly type: 'drop_table'
  readonly table: string
}

export interface WarnRemovedColumnChange {
  readonly type: 'warn_removed_column'
  readonly table: string
  readonly column: string
}

export interface WarnRemovedTableChange {
  readonly type: 'warn_removed_table'
  readonly table: string
}

export interface MigrationResult {
  readonly applied: boolean
  readonly statementsExecuted: number
  readonly sql: readonly string[]
  readonly warnings: readonly string[]
}

export interface MigrationRunOptions {
  readonly dryRun?: boolean
  readonly prune?: boolean
  readonly confirmSiteName?: string
  readonly actualSiteName?: string
}

export interface DiffOptions {
  readonly prune?: boolean
}
