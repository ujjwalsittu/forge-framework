import { describe, it, expect } from 'vitest'
import { defineSchema } from '../define'

describe('defineSchema()', () => {
  it('returns a SchematypeDefinition object with correct name and fields', () => {
    const schema = defineSchema({
      name: 'TestDoc',
      module: '@test/module',
      label: 'Test Document',
      titleField: 'title',
      naming: { type: 'autoincrement' },
      fields: [
        { name: 'title', type: 'Data', required: true },
        { name: 'amount', type: 'Currency' },
        { name: 'status', type: 'Select', options: ['Draft', 'Active'] },
      ],
      permissions: [],
    })
    expect(schema.name).toBe('TestDoc')
    expect(schema.fields).toHaveLength(3)
    expect(schema.module).toBe('@test/module')
  })

  it('throws when required props are missing', () => {
    expect(() =>
      defineSchema({
        name: 'Bad',
      } as never),
    ).toThrow()
  })

  it('throws on duplicate field names', () => {
    expect(() =>
      defineSchema({
        name: 'DupFields',
        module: '@test',
        label: 'Dup Fields',
        titleField: 'title',
        naming: { type: 'autoincrement' },
        fields: [
          { name: 'title', type: 'Data' },
          { name: 'title', type: 'Data' },
        ],
        permissions: [],
      }),
    ).toThrow('Duplicate field name: title')
  })

  it('throws when Link field is missing "to" property', () => {
    expect(() =>
      defineSchema({
        name: 'BadLink',
        module: '@test',
        label: 'Bad Link',
        titleField: 'id',
        naming: { type: 'autoincrement' },
        fields: [{ name: 'customer', type: 'Link' } as never],
        permissions: [],
      }),
    ).toThrow()
  })

  it('throws when Select field is missing "options"', () => {
    expect(() =>
      defineSchema({
        name: 'BadSelect',
        module: '@test',
        label: 'Bad Select',
        titleField: 'id',
        naming: { type: 'autoincrement' },
        fields: [{ name: 'status', type: 'Select' } as never],
        permissions: [],
      }),
    ).toThrow()
  })

  it('throws when ChildTable field is missing "schema"', () => {
    expect(() =>
      defineSchema({
        name: 'BadChild',
        module: '@test',
        label: 'Bad Child',
        titleField: 'id',
        naming: { type: 'autoincrement' },
        fields: [{ name: 'items', type: 'ChildTable' } as never],
        permissions: [],
      }),
    ).toThrow()
  })

  it('throws when DynamicLink field is missing "typeField"', () => {
    expect(() =>
      defineSchema({
        name: 'BadDynLink',
        module: '@test',
        label: 'Bad DynLink',
        titleField: 'id',
        naming: { type: 'autoincrement' },
        fields: [{ name: 'ref', type: 'DynamicLink' } as never],
        permissions: [],
      }),
    ).toThrow()
  })

  it('accepts all 24 field types without error', () => {
    const schema = defineSchema({
      name: 'AllTypes',
      module: '@test',
      label: 'All Types',
      titleField: 'name',
      naming: { type: 'autoincrement' },
      fields: [
        { name: 'name', type: 'AutoName' },
        { name: 'f_data', type: 'Data' },
        { name: 'f_longtext', type: 'LongText' },
        { name: 'f_int', type: 'Int' },
        { name: 'f_float', type: 'Float' },
        { name: 'f_currency', type: 'Currency' },
        { name: 'f_percent', type: 'Percent' },
        { name: 'f_date', type: 'Date' },
        { name: 'f_datetime', type: 'DateTime' },
        { name: 'f_time', type: 'Time' },
        { name: 'f_duration', type: 'Duration' },
        { name: 'f_select', type: 'Select', options: ['A', 'B'] },
        { name: 'f_link', type: 'Link', to: 'OtherDoc' },
        { name: 'f_dynlink_type', type: 'Data' },
        { name: 'f_dynlink', type: 'DynamicLink', typeField: 'f_dynlink_type' },
        { name: 'f_child', type: 'ChildTable', schema: 'ChildDoc' },
        { name: 'f_attach', type: 'Attach' },
        { name: 'f_attachimg', type: 'AttachImage' },
        { name: 'f_check', type: 'Check' },
        { name: 'f_json', type: 'JSON' },
        { name: 'f_color', type: 'Color' },
        { name: 'f_barcode', type: 'Barcode' },
        { name: 'f_geo', type: 'Geolocation' },
        { name: 'f_password', type: 'Password' },
        { name: 'f_rating', type: 'Rating' },
        { name: 'f_markdown', type: 'Markdown' },
        { name: 'f_code', type: 'Code' },
        { name: 'f_html', type: 'HTML' },
        { name: 'f_signature', type: 'Signature' },
      ],
      permissions: [],
    })
    expect(schema.fields).toHaveLength(29)
  })

  it('freezes the returned definition (immutability)', () => {
    const schema = defineSchema({
      name: 'Frozen',
      module: '@test',
      label: 'Frozen',
      titleField: 'title',
      naming: { type: 'autoincrement' },
      fields: [{ name: 'title', type: 'Data' }],
      permissions: [],
    })
    expect(Object.isFrozen(schema)).toBe(true)
    expect(Object.isFrozen(schema.fields)).toBe(true)
  })

  it('validates naming config: series pattern', () => {
    const schema = defineSchema({
      name: 'Series',
      module: '@test',
      label: 'Series',
      titleField: 'title',
      naming: { type: 'series', pattern: 'INV-{YYYY}-{####}' },
      fields: [{ name: 'title', type: 'Data' }],
      permissions: [],
    })
    expect(schema.naming.type).toBe('series')
  })

  it('validates naming config: field reference', () => {
    const schema = defineSchema({
      name: 'FieldNamed',
      module: '@test',
      label: 'FieldNamed',
      titleField: 'code',
      naming: { type: 'field', field: 'code' },
      fields: [{ name: 'code', type: 'Data', required: true }],
      permissions: [],
    })
    expect(schema.naming.type).toBe('field')
  })

  it('rejects naming field reference to non-existent field', () => {
    expect(() =>
      defineSchema({
        name: 'BadFieldNaming',
        module: '@test',
        label: 'Bad',
        titleField: 'title',
        naming: { type: 'field', field: 'nonexistent' },
        fields: [{ name: 'title', type: 'Data' }],
        permissions: [],
      }),
    ).toThrow()
  })
})
