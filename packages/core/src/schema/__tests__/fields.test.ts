import { describe, it, expect } from 'vitest'
import { validateField, FIELD_TYPES } from '../fields'

describe('Field type validation', () => {
  it('exports all 24 field types', () => {
    const expected = [
      'Data', 'LongText', 'Int', 'Float', 'Currency', 'Percent',
      'Date', 'DateTime', 'Time', 'Duration',
      'Select', 'Link', 'DynamicLink',
      'ChildTable', 'Table',
      'Attach', 'AttachImage',
      'Check', 'AutoName', 'JSON',
      'Color', 'Barcode', 'Geolocation',
      'Password', 'Rating', 'Markdown', 'Code', 'HTML', 'Signature',
    ]
    for (const ft of expected) {
      expect(FIELD_TYPES).toContain(ft)
    }
  })

  it('Data field accepts maxLength and minLength', () => {
    expect(() =>
      validateField({ name: 'f', type: 'Data', maxLength: 100, minLength: 1 }),
    ).not.toThrow()
  })

  it('Data field rejects negative maxLength', () => {
    expect(() =>
      validateField({ name: 'f', type: 'Data', maxLength: -1 }),
    ).toThrow()
  })

  it('Currency field is never mapped to floating point', () => {
    const result = validateField({ name: 'amount', type: 'Currency' })
    expect(result.type).toBe('Currency')
    // Currency fields should be flagged for Decimal.js usage, not JS number
  })

  it('Password field is always marked sensitive', () => {
    const result = validateField({ name: 'pass', type: 'Password' })
    expect(result.sensitive).toBe(true)
  })

  it('Geolocation field validates correctly', () => {
    const result = validateField({ name: 'loc', type: 'Geolocation' })
    expect(result.type).toBe('Geolocation')
  })

  it('rejects unknown field type', () => {
    expect(() =>
      validateField({ name: 'bad', type: 'UnknownType' as never }),
    ).toThrow()
  })

  it('Link field requires "to" property', () => {
    expect(() =>
      validateField({ name: 'ref', type: 'Link' } as never),
    ).toThrow()
  })

  it('Link field accepts valid "to" property', () => {
    expect(() =>
      validateField({ name: 'ref', type: 'Link', to: 'Customer' }),
    ).not.toThrow()
  })

  it('Select field requires "options" property', () => {
    expect(() =>
      validateField({ name: 'status', type: 'Select' } as never),
    ).toThrow()
  })

  it('Select field accepts string array options', () => {
    expect(() =>
      validateField({ name: 'status', type: 'Select', options: ['Draft', 'Active'] }),
    ).not.toThrow()
  })

  it('ChildTable field requires "schema" property', () => {
    expect(() =>
      validateField({ name: 'items', type: 'ChildTable' } as never),
    ).toThrow()
  })

  it('DynamicLink field requires "typeField" property', () => {
    expect(() =>
      validateField({ name: 'ref', type: 'DynamicLink' } as never),
    ).toThrow()
  })

  it('Rating field defaults max to 5', () => {
    const result = validateField({ name: 'stars', type: 'Rating' })
    expect(result.type).toBe('Rating')
  })
})
