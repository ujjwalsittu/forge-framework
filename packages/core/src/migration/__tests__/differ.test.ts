import { describe, it, expect } from 'vitest'
import { diffSchemas } from '../differ'
import type { DatabaseSnapshot, SchemaChange } from '../types'

function makeSnapshot(tables: DatabaseSnapshot['tables']): DatabaseSnapshot {
  return { tables }
}

function makeTable(
  columns: Record<string, { sqlType: string; notNull: boolean }>,
): DatabaseSnapshot['tables'][string] {
  return { columns }
}

describe('diffSchemas()', () => {
  it('detects new table (schema added)', () => {
    const before = makeSnapshot({})
    const after = makeSnapshot({
      Item: makeTable({ name: { sqlType: 'varchar(255)', notNull: true } }),
    })
    const changes = diffSchemas(before, after)
    expect(changes).toContainEqual(
      expect.objectContaining({ type: 'create_table', table: 'Item' }),
    )
  })

  it('detects new column (field added)', () => {
    const before = makeSnapshot({
      Item: makeTable({ name: { sqlType: 'varchar(255)', notNull: true } }),
    })
    const after = makeSnapshot({
      Item: makeTable({
        name: { sqlType: 'varchar(255)', notNull: true },
        price: { sqlType: 'decimal(20,9)', notNull: true },
      }),
    })
    const changes = diffSchemas(before, after)
    expect(changes).toContainEqual(
      expect.objectContaining({ type: 'add_column', table: 'Item', column: 'price' }),
    )
  })

  it('detects column type change', () => {
    const before = makeSnapshot({
      Item: makeTable({ status: { sqlType: 'varchar(50)', notNull: false } }),
    })
    const after = makeSnapshot({
      Item: makeTable({ status: { sqlType: 'varchar(100)', notNull: false } }),
    })
    const changes = diffSchemas(before, after)
    expect(changes).toContainEqual(
      expect.objectContaining({
        type: 'alter_column',
        table: 'Item',
        column: 'status',
        from: 'varchar(50)',
        to: 'varchar(100)',
      }),
    )
  })

  it('detects NOT NULL added', () => {
    const before = makeSnapshot({
      Item: makeTable({ name: { sqlType: 'varchar(255)', notNull: false } }),
    })
    const after = makeSnapshot({
      Item: makeTable({ name: { sqlType: 'varchar(255)', notNull: true } }),
    })
    const changes = diffSchemas(before, after)
    expect(changes).toContainEqual(
      expect.objectContaining({
        type: 'set_not_null',
        table: 'Item',
        column: 'name',
      }),
    )
  })

  it('NEVER generates drop_column automatically', () => {
    const before = makeSnapshot({
      Item: makeTable({
        name: { sqlType: 'varchar(255)', notNull: true },
        old_col: { sqlType: 'text', notNull: false },
      }),
    })
    const after = makeSnapshot({
      Item: makeTable({
        name: { sqlType: 'varchar(255)', notNull: true },
      }),
    })
    const changes = diffSchemas(before, after)
    const drops = changes.filter((c): c is SchemaChange & { type: 'drop_column' } =>
      c.type === 'drop_column',
    )
    expect(drops).toHaveLength(0)
  })

  it('generates warn_removed_column for removed fields', () => {
    const before = makeSnapshot({
      Item: makeTable({
        name: { sqlType: 'varchar(255)', notNull: true },
        old_col: { sqlType: 'text', notNull: false },
      }),
    })
    const after = makeSnapshot({
      Item: makeTable({
        name: { sqlType: 'varchar(255)', notNull: true },
      }),
    })
    const changes = diffSchemas(before, after)
    expect(changes).toContainEqual(
      expect.objectContaining({
        type: 'warn_removed_column',
        table: 'Item',
        column: 'old_col',
      }),
    )
  })

  it('NEVER generates drop_table automatically', () => {
    const before = makeSnapshot({
      Item: makeTable({ name: { sqlType: 'varchar(255)', notNull: true } }),
    })
    const after = makeSnapshot({})
    const changes = diffSchemas(before, after)
    const drops = changes.filter(c => c.type === 'drop_table')
    expect(drops).toHaveLength(0)
  })

  it('generates warn_removed_table for removed tables', () => {
    const before = makeSnapshot({
      Item: makeTable({ name: { sqlType: 'varchar(255)', notNull: true } }),
    })
    const after = makeSnapshot({})
    const changes = diffSchemas(before, after)
    expect(changes).toContainEqual(
      expect.objectContaining({ type: 'warn_removed_table', table: 'Item' }),
    )
  })

  it('with prune=true: generates drop_column', () => {
    const before = makeSnapshot({
      Item: makeTable({
        name: { sqlType: 'varchar(255)', notNull: true },
        old_col: { sqlType: 'text', notNull: false },
      }),
    })
    const after = makeSnapshot({
      Item: makeTable({
        name: { sqlType: 'varchar(255)', notNull: true },
      }),
    })
    const changes = diffSchemas(before, after, { prune: true })
    expect(changes).toContainEqual(
      expect.objectContaining({ type: 'drop_column', table: 'Item', column: 'old_col' }),
    )
  })

  it('returns empty array when schemas are identical', () => {
    const snapshot = makeSnapshot({
      Item: makeTable({ name: { sqlType: 'varchar(255)', notNull: true } }),
    })
    const changes = diffSchemas(snapshot, snapshot)
    expect(changes).toHaveLength(0)
  })
})
