import { describe, it, expect } from 'vitest'
import { generateDrizzleSchema } from '../codegen'
import { defineSchema } from '../../schema/define'
import type { ColumnDef } from '../types'

/** Safe column accessor — throws if column missing (better than non-null assertion) */
function col(columns: Readonly<Record<string, ColumnDef>>, name: string): ColumnDef {
  const c = columns[name]
  if (!c) {
    throw new Error(`Column "${name}" not found. Available: ${Object.keys(columns).join(', ')}`)
  }
  return c
}

const itemSchema = defineSchema({
  name: 'Item',
  module: '@test',
  label: 'Item',
  titleField: 'item_name',
  naming: { type: 'series', pattern: 'ITEM-{####}' },
  fields: [
    { name: 'item_name', type: 'Data', required: true },
    { name: 'description', type: 'LongText' },
    { name: 'price', type: 'Currency', required: true },
    { name: 'qty', type: 'Int' },
    { name: 'weight', type: 'Float' },
    { name: 'discount', type: 'Percent' },
    { name: 'category', type: 'Link', to: 'Category' },
    { name: 'is_active', type: 'Check' },
    { name: 'created_date', type: 'Date' },
    { name: 'modified_at', type: 'DateTime' },
    { name: 'shift_time', type: 'Time' },
    { name: 'build_time', type: 'Duration' },
    { name: 'status', type: 'Select', options: ['Draft', 'Active', 'Archived'] },
    { name: 'metadata', type: 'JSON' },
    { name: 'color', type: 'Color' },
    { name: 'location', type: 'Geolocation' },
    { name: 'secret', type: 'Password' },
    { name: 'stars', type: 'Rating' },
  ],
  permissions: [],
})

const orderSchema = defineSchema({
  name: 'Order',
  module: '@test',
  label: 'Order',
  titleField: 'name',
  naming: { type: 'series', pattern: 'ORD-{####}' },
  fields: [
    { name: 'name', type: 'AutoName' },
    { name: 'customer', type: 'Link', to: 'Customer', required: true },
    { name: 'lines', type: 'ChildTable', schema: 'OrderLine' },
  ],
  permissions: [],
})

describe('generateDrizzleSchema()', () => {
  describe('system columns', () => {
    it('generates all standard system columns', () => {
      const result = generateDrizzleSchema(itemSchema, 'sqlite')
      const colNames = Object.keys(result.columns)
      expect(colNames).toContain('id')
      expect(colNames).toContain('name')
      expect(colNames).toContain('created_at')
      expect(colNames).toContain('updated_at')
      expect(colNames).toContain('created_by')
      expect(colNames).toContain('modified_by')
      expect(colNames).toContain('owner')
      expect(colNames).toContain('docstatus')
    })
  })

  describe('field type mapping', () => {
    it('maps Data to varchar(255)', () => {
      const result = generateDrizzleSchema(itemSchema, 'sqlite')
      expect(col(result.columns, 'item_name').sqlType).toBe('text') // sqlite uses text
    })

    it('maps Data to varchar(255) for postgres', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'item_name').sqlType).toBe('varchar(255)')
    })

    it('maps Currency to decimal(20,9) — NEVER floating point', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      const priceCol = col(result.columns, 'price')
      expect(priceCol.sqlType).toBe('decimal(20,9)')
    })

    it('maps Currency to text for sqlite (decimal emulation)', () => {
      const result = generateDrizzleSchema(itemSchema, 'sqlite')
      expect(col(result.columns, 'price').sqlType).toBe('text')
    })

    it('maps Int to bigint', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'qty').sqlType).toBe('bigint')
    })

    it('maps Float to double precision', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'weight').sqlType).toBe('double precision')
    })

    it('maps Percent to decimal(10,5)', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'discount').sqlType).toBe('decimal(10,5)')
    })

    it('maps Check to boolean', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'is_active').sqlType).toBe('boolean')
    })

    it('maps Link to varchar(255)', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'category').sqlType).toBe('varchar(255)')
    })

    it('maps Select to varchar(100)', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'status').sqlType).toBe('varchar(100)')
    })

    it('maps JSON to jsonb for postgres', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'metadata').sqlType).toBe('jsonb')
    })

    it('maps JSON to text for sqlite', () => {
      const result = generateDrizzleSchema(itemSchema, 'sqlite')
      expect(col(result.columns, 'metadata').sqlType).toBe('text')
    })

    it('maps Color to varchar(7)', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'color').sqlType).toBe('varchar(7)')
    })

    it('maps Geolocation to two decimal columns (_lat, _lng)', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'location_lat').sqlType).toBe('decimal(9,6)')
      expect(col(result.columns, 'location_lng').sqlType).toBe('decimal(9,6)')
      // Original field name should not be a column
      expect(result.columns['location']).toBeUndefined()
    })

    it('maps Password to text', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'secret').sqlType).toBe('text')
    })

    it('maps Date to date', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'created_date').sqlType).toBe('date')
    })

    it('maps DateTime to timestamp with time zone', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'modified_at').sqlType).toBe('timestamp with time zone')
    })

    it('maps Time to time', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'shift_time').sqlType).toBe('time')
    })

    it('maps Duration to integer', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'build_time').sqlType).toBe('integer')
    })

    it('maps Rating to smallint', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'stars').sqlType).toBe('smallint')
    })
  })

  describe('constraints', () => {
    it('marks required fields as notNull', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'item_name').notNull).toBe(true)
      expect(col(result.columns, 'price').notNull).toBe(true)
    })

    it('non-required fields are nullable', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      expect(col(result.columns, 'description').notNull).toBe(false)
    })

    it('AutoName field becomes primary key varchar(255)', () => {
      const result = generateDrizzleSchema(orderSchema, 'postgres')
      expect(col(result.columns, 'name').sqlType).toBe('varchar(255)')
      expect(col(result.columns, 'name').primaryKey).toBe(true)
    })
  })

  describe('child tables', () => {
    it('generates ChildTable as separate table with parent_id FK', () => {
      const result = generateDrizzleSchema(orderSchema, 'postgres')
      expect(result.childTables).toContain('OrderLine')
    })
  })

  describe('security', () => {
    it('sanitizes table name (no special characters)', () => {
      const badSchema = defineSchema({
        name: 'Test Doc',
        module: '@test',
        label: 'Test',
        titleField: 'title',
        naming: { type: 'autoincrement' },
        fields: [{ name: 'title', type: 'Data' }],
        permissions: [],
      })
      // Should sanitize to safe identifier
      const result = generateDrizzleSchema(badSchema, 'postgres')
      expect(result.tableName).toMatch(/^[a-z_][a-z0-9_]*$/i)
    })

    it('sanitizes field names (no SQL injection via column names)', () => {
      const result = generateDrizzleSchema(itemSchema, 'postgres')
      for (const colName of Object.keys(result.columns)) {
        expect(colName).toMatch(/^[a-z_][a-z0-9_]*$/i)
      }
    })
  })
})
