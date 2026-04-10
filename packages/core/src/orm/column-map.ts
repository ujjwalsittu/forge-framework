/**
 * Maps Forge FieldType → SQL column type for Postgres and SQLite dialects.
 *
 * Key constraint: Currency MUST use decimal(20,9), NEVER floating point.
 */
import type { FieldDefinition } from '../schema/types'
import type { ColumnDef, Dialect } from './types'

const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Sanitize a name to be a safe SQL identifier.
 * Strips non-alphanumeric characters, replaces spaces with underscores.
 */
export function sanitizeIdentifier(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&')
  if (!IDENTIFIER_RE.test(sanitized)) {
    throw new Error(`Cannot sanitize "${name}" to a valid SQL identifier`)
  }
  return sanitized
}

interface ColumnMapping {
  postgres: string
  sqlite: string
}

const TYPE_MAP: Record<string, ColumnMapping> = {
  Data: { postgres: 'varchar(255)', sqlite: 'text' },
  LongText: { postgres: 'text', sqlite: 'text' },
  Int: { postgres: 'bigint', sqlite: 'integer' },
  Float: { postgres: 'double precision', sqlite: 'real' },
  Currency: { postgres: 'decimal(20,9)', sqlite: 'text' },
  Percent: { postgres: 'decimal(10,5)', sqlite: 'text' },
  Date: { postgres: 'date', sqlite: 'text' },
  DateTime: { postgres: 'timestamp with time zone', sqlite: 'text' },
  Time: { postgres: 'time', sqlite: 'text' },
  Duration: { postgres: 'integer', sqlite: 'integer' },
  Select: { postgres: 'varchar(100)', sqlite: 'text' },
  Link: { postgres: 'varchar(255)', sqlite: 'text' },
  DynamicLink: { postgres: 'varchar(255)', sqlite: 'text' },
  Attach: { postgres: 'varchar(512)', sqlite: 'text' },
  AttachImage: { postgres: 'varchar(512)', sqlite: 'text' },
  Check: { postgres: 'boolean', sqlite: 'integer' },
  AutoName: { postgres: 'varchar(255)', sqlite: 'text' },
  JSON: { postgres: 'jsonb', sqlite: 'text' },
  Color: { postgres: 'varchar(7)', sqlite: 'text' },
  Barcode: { postgres: 'varchar(255)', sqlite: 'text' },
  Password: { postgres: 'text', sqlite: 'text' },
  Rating: { postgres: 'smallint', sqlite: 'integer' },
  Markdown: { postgres: 'text', sqlite: 'text' },
  Code: { postgres: 'text', sqlite: 'text' },
  HTML: { postgres: 'text', sqlite: 'text' },
  Signature: { postgres: 'text', sqlite: 'text' },
  Table: { postgres: 'jsonb', sqlite: 'text' },
}

/**
 * Map a single FieldDefinition to one or more ColumnDefs.
 * Most fields produce a single column. Geolocation produces two (_lat, _lng).
 * ChildTable produces no columns (it's a separate table).
 */
export function mapFieldToColumns(
  field: FieldDefinition,
  dialect: Dialect,
): ColumnDef[] {
  const safeName = sanitizeIdentifier(field.name)

  // Geolocation → two decimal columns
  if (field.type === 'Geolocation') {
    const latType = dialect === 'postgres' ? 'decimal(9,6)' : 'text'
    const lngType = dialect === 'postgres' ? 'decimal(9,6)' : 'text'
    return [
      {
        name: `${safeName}_lat`,
        sqlType: latType,
        notNull: field.required === true,
        primaryKey: false,
      },
      {
        name: `${safeName}_lng`,
        sqlType: lngType,
        notNull: field.required === true,
        primaryKey: false,
      },
    ]
  }

  // ChildTable → separate table, no column on parent
  if (field.type === 'ChildTable') {
    return []
  }

  const mapping = TYPE_MAP[field.type]
  if (!mapping) {
    throw new Error(`No column mapping for field type: ${field.type}`)
  }

  return [
    {
      name: safeName,
      sqlType: mapping[dialect],
      notNull: field.required === true,
      primaryKey: field.type === 'AutoName',
    },
  ]
}
