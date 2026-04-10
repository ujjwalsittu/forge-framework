/**
 * Tenant context — AsyncLocalStorage-based isolation.
 *
 * forge.context() / forge.db / forge.user / forge.site are available
 * anywhere in the call stack within a request or job scope.
 *
 * The context is frozen after injection to prevent mutation.
 */
import { AsyncLocalStorage } from 'async_hooks'
import type { SiteContext, SiteConfig, UserContext, CacheInterface } from './types'
import type Database from 'better-sqlite3'

const storage = new AsyncLocalStorage<SiteContext>()

function getContext(): SiteContext {
  const ctx = storage.getStore()
  if (!ctx) {
    throw new Error(
      'No site context available. This code must run inside a request handler or background job.',
    )
  }
  return ctx
}

/**
 * The global forge namespace — provides tenant-scoped access to
 * database, cache, user, and site config.
 */
export const forge = {
  /** Get the full SiteContext. Throws if outside request/job scope. */
  context(): SiteContext {
    return getContext()
  },

  /** Drizzle DB connection for the current tenant. */
  get db(): Database.Database {
    return getContext().db
  },

  /** Current authenticated user. */
  get user(): UserContext {
    return getContext().user
  },

  /** Current tenant site configuration. */
  get site(): SiteConfig {
    return getContext().site
  },

  /** Namespaced cache for the current tenant. */
  get cache(): CacheInterface {
    return getContext().cache
  },

  /** Check if a module is installed on the current tenant. */
  hasModule(pkg: string): boolean {
    return getContext().site.installedModules.includes(pkg)
  },

  /** Get a feature flag value for the current tenant. */
  flag(key: string): boolean {
    return getContext().site.featureFlags[key] ?? false
  },
}

/**
 * Run a function within a tenant's site context.
 * The context is frozen before execution to prevent mutation.
 * Always returns a Promise for consistent async usage.
 */
export function runInSiteContext<T>(
  context: SiteContext,
  fn: () => T | Promise<T>,
): Promise<T> {
  // Deep-freeze the context to prevent mutation
  const frozenContext: SiteContext = Object.freeze({
    site: Object.freeze({ ...context.site }),
    db: context.db,
    cache: context.cache,
    user: Object.freeze({ ...context.user }),
  })

  // AsyncLocalStorage.run returns the callback's return value at runtime.
  // Outdated @types/node (12.x) types it as void, so we capture via a local variable.
  let result: T | Promise<T> | undefined
  storage.run(frozenContext, () => {
    result = fn()
  })
  return Promise.resolve(result as T | Promise<T>)
}
