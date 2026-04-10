/**
 * ORM type definitions for Drizzle schema generation.
 */

export type Dialect = 'postgres' | 'sqlite'

export interface ColumnDef {
  readonly name: string
  readonly sqlType: string
  readonly notNull: boolean
  readonly primaryKey: boolean
  readonly defaultValue?: string | undefined
  readonly references?: {
    readonly table: string
    readonly column: string
  }
}

export interface DrizzleTableResult {
  readonly tableName: string
  readonly columns: Readonly<Record<string, ColumnDef>>
  readonly childTables: readonly string[]
  readonly systemColumns: readonly string[]
}
