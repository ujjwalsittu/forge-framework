/**
 * Multi-tenancy type definitions.
 */
import type Database from 'better-sqlite3'

export interface SiteConfig {
  readonly id: string
  readonly host: string
  readonly name: string
  readonly dbUrl: string
  readonly redisNamespace: string
  readonly installedModules: readonly string[]
  readonly featureFlags: Readonly<Record<string, boolean>>
  readonly timezone: string
  readonly language: string
  readonly currency: string
  readonly dateFormat: string
  readonly plan: 'starter' | 'pro' | 'enterprise' | 'selfhosted'
  readonly status: 'active' | 'suspended' | 'pending'
}

export interface UserContext {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly roles: readonly string[]
}

export interface CacheInterface {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlMs?: number): Promise<void>
  del(key: string): Promise<void>
}

export interface SiteContext {
  readonly site: SiteConfig
  readonly db: Database.Database
  readonly cache: CacheInterface
  readonly user: UserContext
}
