import { describe, it, expect } from 'vitest'
import { NamespacedCache } from '../namespaced-cache'

describe('NamespacedCache', () => {
  it('prefixes keys with namespace', async () => {
    const store = new Map<string, string>()
    const cache = new NamespacedCache('tenant-1', store)

    await cache.set('mykey', 'myvalue')
    expect(store.has('tenant-1:mykey')).toBe(true)
    expect(store.has('mykey')).toBe(false)
  })

  it('get returns null for missing keys', async () => {
    const store = new Map<string, string>()
    const cache = new NamespacedCache('tenant-1', store)

    const result = await cache.get('nonexistent')
    expect(result).toBeNull()
  })

  it('get returns value for existing keys', async () => {
    const store = new Map<string, string>()
    const cache = new NamespacedCache('tenant-1', store)

    await cache.set('key1', 'value1')
    const result = await cache.get('key1')
    expect(result).toBe('value1')
  })

  it('del removes the namespaced key', async () => {
    const store = new Map<string, string>()
    const cache = new NamespacedCache('tenant-1', store)

    await cache.set('key1', 'value1')
    await cache.del('key1')
    expect(await cache.get('key1')).toBeNull()
  })

  it('different namespaces are fully isolated', async () => {
    const store = new Map<string, string>()
    const cache1 = new NamespacedCache('tenant-1', store)
    const cache2 = new NamespacedCache('tenant-2', store)

    await cache1.set('shared-key', 'value-from-1')
    await cache2.set('shared-key', 'value-from-2')

    expect(await cache1.get('shared-key')).toBe('value-from-1')
    expect(await cache2.get('shared-key')).toBe('value-from-2')
  })

  it('cannot access keys without namespace prefix', async () => {
    const store = new Map<string, string>()
    store.set('raw-key', 'raw-value')

    const cache = new NamespacedCache('tenant-1', store)
    // NamespacedCache should not see 'raw-key' — it looks for 'tenant-1:raw-key'
    expect(await cache.get('raw-key')).toBeNull()
  })
})
