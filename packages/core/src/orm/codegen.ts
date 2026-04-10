/**
 * Generates a Drizzle-compatible table schema from a SchematypeDefinition.
 * Produces column definitions for all fields plus system columns.
 *
 * No raw SQL string construction — only structured column definitions.
 */
import type { SchematypeDefinition } from '../schema/types'
import type { ColumnDef, Dialect, DrizzleTableResult } from './types'
import { mapFieldToColumns, sanitizeIdentifier } from './column-map'

const SYSTEM_COLUMNS: readonly string[] = [
  'id', 'name', 'created_at', 'updated_at',
  'created_by', 'modified_by', 'owner', 'docstatus',
]

function buildSystemColumns(dialect: Dialect): Record<string, ColumnDef> {
  const varchar255 = dialect === 'postgres' ? 'varchar(255)' : 'text'
  const timestamptz = dialect === 'postgres' ? 'timestamp with time zone' : 'text'

  return {
    id: {
      name: 'id',
      sqlType: dialect === 'postgres' ? 'uuid' : 'text',
      notNull: true,
      primaryKey: false, // may be overridden if no AutoName field exists
      defaultValue: dialect === 'postgres' ? 'gen_random_uuid()' : undefined,
    },
    name: {
      name: 'name',
      sqlType: varchar255,
      notNull: true,
      primaryKey: false,
    },
    created_at: {
      name: 'created_at',
      sqlType: timestamptz,
      notNull: true,
      primaryKey: false,
      defaultValue: dialect === 'postgres' ? 'now()' : undefined,
    },
    updated_at: {
      name: 'updated_at',
      sqlType: timestamptz,
      notNull: false,
      primaryKey: false,
    },
    created_by: {
      name: 'created_by',
      sqlType: varchar255,
      notNull: false,
      primaryKey: false,
    },
    modified_by: {
      name: 'modified_by',
      sqlType: varchar255,
      notNull: false,
      primaryKey: false,
    },
    owner: {
      name: 'owner',
      sqlType: varchar255,
      notNull: false,
      primaryKey: false,
    },
    docstatus: {
      name: 'docstatus',
      sqlType: dialect === 'postgres' ? 'smallint' : 'integer',
      notNull: true,
      primaryKey: false,
      defaultValue: '0',
    },
  }
}

/**
 * Generate a Drizzle-compatible table definition from a SchematypeDefinition.
 *
 * @param schema - The validated SchematypeDefinition
 * @param dialect - Target database dialect ('postgres' | 'sqlite')
 * @returns DrizzleTableResult with columns, child table refs, and system columns
 */
export function generateDrizzleSchema(
  schema: SchematypeDefinition,
  dialect: Dialect,
): DrizzleTableResult {
  const tableName = sanitizeIdentifier(schema.name)
  const columns: Record<string, ColumnDef> = { ...buildSystemColumns(dialect) }
  const childTables: string[] = []

  // Check if schema has an AutoName field — if so, that field is the PK
  const hasAutoName = schema.fields.some(f => f.type === 'AutoName')

  // If no AutoName, id is the primary key
  if (!hasAutoName) {
    const idCol = columns['id']
    if (idCol) {
      columns['id'] = {
        name: idCol.name,
        sqlType: idCol.sqlType,
        notNull: idCol.notNull,
        primaryKey: true,
        defaultValue: idCol.defaultValue,
      }
    }
  }

  for (const field of schema.fields) {
    // ChildTable → track as separate table, no column on parent
    if (field.type === 'ChildTable') {
      if ('schema' in field) {
        childTables.push(field.schema)
      }
      continue
    }

    const fieldColumns = mapFieldToColumns(field, dialect)
    for (const col of fieldColumns) {
      // AutoName field: set as PK and override the system 'name' column
      if (field.type === 'AutoName') {
        const existing = columns['name'] ?? columns['id']
        if (existing) {
          const col: ColumnDef = {
            name: existing.name,
            sqlType: existing.sqlType,
            notNull: existing.notNull,
            primaryKey: true,
          }
          columns['name'] = existing.defaultValue !== undefined
            ? { ...col, defaultValue: existing.defaultValue }
            : col
        }
        continue
      }

      // Don't overwrite system columns
      if (col.name in columns && SYSTEM_COLUMNS.includes(col.name)) {
        continue
      }

      columns[col.name] = col
    }
  }

  return Object.freeze({
    tableName,
    columns: Object.freeze(columns),
    childTables: Object.freeze(childTables),
    systemColumns: SYSTEM_COLUMNS,
  })
}
