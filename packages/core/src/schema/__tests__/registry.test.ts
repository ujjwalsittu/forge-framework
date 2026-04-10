import { describe, it, expect, beforeEach } from 'vitest'
import { SchemaRegistry } from '../registry'
import { defineSchema } from '../define'

describe('SchemaRegistry', () => {
  let registry: SchemaRegistry

  beforeEach(() => {
    registry = new SchemaRegistry()
  })

  const makeSchema = (name: string): ReturnType<typeof defineSchema> =>
    defineSchema({
      name,
      module: '@test',
      label: name,
      titleField: 'title',
      naming: { type: 'autoincrement' },
      fields: [{ name: 'title', type: 'Data' }],
      permissions: [],
    })

  it('registers and retrieves a schema', () => {
    const schema = makeSchema('TestDoc')
    registry.register(schema)
    expect(registry.get('TestDoc')).toBe(schema)
  })

  it('returns undefined for unregistered schema', () => {
    expect(registry.get('NonExistent')).toBeUndefined()
  })

  it('has() returns true for registered, false for unregistered', () => {
    registry.register(makeSchema('Exists'))
    expect(registry.has('Exists')).toBe(true)
    expect(registry.has('Missing')).toBe(false)
  })

  it('list() returns all registered schemas', () => {
    registry.register(makeSchema('Doc1'))
    registry.register(makeSchema('Doc2'))
    registry.register(makeSchema('Doc3'))
    const list = registry.list()
    expect(list).toHaveLength(3)
    expect(list.map(s => s.name)).toEqual(['Doc1', 'Doc2', 'Doc3'])
  })

  it('throws when registering duplicate schema name', () => {
    registry.register(makeSchema('Dup'))
    expect(() => {
      registry.register(makeSchema('Dup'))
    }).toThrow('Schema "Dup" is already registered')
  })

  it('list() returns a frozen array', () => {
    registry.register(makeSchema('Doc1'))
    const list = registry.list()
    expect(Object.isFrozen(list)).toBe(true)
  })
})
