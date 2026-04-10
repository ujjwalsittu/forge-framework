import { describe, it, expect, beforeEach } from 'vitest'
import { createTestTenant } from '../../testing/helpers'
import { forge, runInSiteContext } from '../../tenancy/context'
import type { SiteContext } from '../../tenancy/types'

describe('CRITICAL: Cross-tenant data isolation', () => {
  let tenant1: { context: SiteContext; name: string }
  let tenant2: { context: SiteContext; name: string }

  beforeEach(() => {
    tenant1 = createTestTenant('tenant-1')
    tenant2 = createTestTenant('tenant-2')
  })

  it('forge.db returns current tenant db, never another tenant db', async () => {
    await runInSiteContext(tenant1.context, () => {
      expect(forge.db).toBe(tenant1.context.db)
      expect(forge.db).not.toBe(tenant2.context.db)
    })
    await runInSiteContext(tenant2.context, () => {
      expect(forge.db).toBe(tenant2.context.db)
      expect(forge.db).not.toBe(tenant1.context.db)
    })
  })

  it('forge.site returns current tenant site config', async () => {
    await runInSiteContext(tenant1.context, () => {
      expect(forge.site.id).toBe('tenant-1')
      expect(forge.site.host).toBe('tenant-1.local')
    })
    await runInSiteContext(tenant2.context, () => {
      expect(forge.site.id).toBe('tenant-2')
      expect(forge.site.host).toBe('tenant-2.local')
    })
  })

  it('forge.user returns current tenant user context', async () => {
    await runInSiteContext(tenant1.context, () => {
      expect(forge.user.id).toContain('tenant-1')
    })
    await runInSiteContext(tenant2.context, () => {
      expect(forge.user.id).toContain('tenant-2')
    })
  })

  it('tenant1 cannot read tenant2 cache keys', async () => {
    // Set a key in tenant1's cache
    await runInSiteContext(tenant1.context, async () => {
      await forge.cache.set('secret', 'tenant1-value')
    })

    // Try to read it from tenant2's context — must be null
    await runInSiteContext(tenant2.context, async () => {
      const value = await forge.cache.get('secret')
      expect(value).toBeNull()
    })

    // Confirm tenant1 can still read it
    await runInSiteContext(tenant1.context, async () => {
      const value = await forge.cache.get('secret')
      expect(value).toBe('tenant1-value')
    })
  })

  it('concurrent contexts are isolated via AsyncLocalStorage', async () => {
    // Run both tenants concurrently
    const results = await Promise.all([
      runInSiteContext(tenant1.context, () => forge.site.id),
      runInSiteContext(tenant2.context, () => forge.site.id),
    ])
    expect(results[0]).toBe('tenant-1')
    expect(results[1]).toBe('tenant-2')
  })

  it('forge.context() outside request scope throws descriptive error', () => {
    expect(() => forge.context()).toThrow(
      'No site context available',
    )
  })

  it('SiteContext is frozen after injection (Object.freeze)', async () => {
    await runInSiteContext(tenant1.context, () => {
      const ctx = forge.context()
      expect(Object.isFrozen(ctx)).toBe(true)
      expect(Object.isFrozen(ctx.site)).toBe(true)
      expect(Object.isFrozen(ctx.user)).toBe(true)
    })
  })

  it('forge.hasModule returns correct value per tenant', async () => {
    await runInSiteContext(tenant1.context, () => {
      // tenant-1 has @forge/erp installed (set in test helper)
      expect(forge.hasModule('@forge/erp')).toBe(true)
      expect(forge.hasModule('@forge/nonexistent')).toBe(false)
    })
    await runInSiteContext(tenant2.context, () => {
      // tenant-2 has @forge/hr installed (set in test helper)
      expect(forge.hasModule('@forge/hr')).toBe(true)
      expect(forge.hasModule('@forge/erp')).toBe(false)
    })
  })

  it('forge.flag returns feature flag per tenant', async () => {
    await runInSiteContext(tenant1.context, () => {
      expect(forge.flag('beta_feature')).toBe(true)
    })
    await runInSiteContext(tenant2.context, () => {
      expect(forge.flag('beta_feature')).toBe(false)
    })
  })
})
