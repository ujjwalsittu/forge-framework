/**
 * Test helpers for creating isolated tenant contexts.
 * Each test tenant gets its own in-memory SQLite DB and namespaced cache.
 */
import Database from 'better-sqlite3'
import { NamespacedCache } from '../tenancy/namespaced-cache'
import type { SiteConfig, SiteContext, UserContext } from '../tenancy/types'

/** Shared cache store — simulates a single Redis instance used by all tenants */
const sharedCacheStore = new Map<string, string>()

/**
 * Create an isolated test tenant with its own SQLite DB and namespaced cache.
 * Each tenant has different installed modules and feature flags for testing isolation.
 */
export function createTestTenant(tenantId: string): {
  context: SiteContext
  name: string
} {
  const db = new Database(':memory:')
  const cache = new NamespacedCache(tenantId, sharedCacheStore)

  const modulesByTenant: Record<string, readonly string[]> = {
    'tenant-1': ['@forge/core', '@forge/erp'],
    'tenant-2': ['@forge/core', '@forge/hr'],
  }

  const flagsByTenant: Record<string, Readonly<Record<string, boolean>>> = {
    'tenant-1': { beta_feature: true },
    'tenant-2': { beta_feature: false },
  }

  const site: SiteConfig = {
    id: tenantId,
    host: `${tenantId}.local`,
    name: `Test Site ${tenantId}`,
    dbUrl: ':memory:',
    redisNamespace: tenantId,
    installedModules: modulesByTenant[tenantId] ?? ['@forge/core'],
    featureFlags: flagsByTenant[tenantId] ?? {},
    timezone: 'UTC',
    language: 'en',
    currency: 'USD',
    dateFormat: 'YYYY-MM-DD',
    plan: 'selfhosted',
    status: 'active',
  }

  const user: UserContext = {
    id: `admin-${tenantId}`,
    name: `Admin ${tenantId}`,
    email: `admin@${tenantId}.local`,
    roles: ['Administrator'],
  }

  return {
    context: { site, db, cache, user },
    name: tenantId,
  }
}
