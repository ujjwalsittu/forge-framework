/**
 * NamespacedCache — wraps a shared store with automatic key prefixing.
 * Every key is prefixed with `{namespace}:` to ensure tenant isolation.
 * The raw store is never exposed to application code.
 */
import type { CacheInterface } from './types'

export class NamespacedCache implements CacheInterface {
  private readonly namespace: string
  private readonly store: Map<string, string>

  constructor(namespace: string, store: Map<string, string>) {
    this.namespace = namespace
    this.store = store
  }

  private prefixKey(key: string): string {
    return `${this.namespace}:${key}`
  }

  get(key: string): Promise<string | null> {
    const value = this.store.get(this.prefixKey(key)) ?? null
    return Promise.resolve(value)
  }

  set(...[key, value]: [key: string, value: string, ttlMs?: number]): Promise<void> {
    this.store.set(this.prefixKey(key), value)
    return Promise.resolve()
  }

  del(key: string): Promise<void> {
    this.store.delete(this.prefixKey(key))
    return Promise.resolve()
  }
}
