import { describe, it, expect, beforeEach } from 'vitest'
import {
  QueueManager,
  buildQueueName,
  createJobPayload,
  validateJobContext,
} from '../manager'
import type { JobPayload, QueuePriority } from '../types'

describe('buildQueueName()', () => {
  it('creates queue name with site-id prefix', () => {
    expect(buildQueueName('tenant-1', 'default')).toBe('tenant-1:forge:default')
    expect(buildQueueName('tenant-1', 'high')).toBe('tenant-1:forge:high')
    expect(buildQueueName('tenant-1', 'low')).toBe('tenant-1:forge:low')
  })

  it('different tenants produce different queue names', () => {
    const q1 = buildQueueName('tenant-1', 'default')
    const q2 = buildQueueName('tenant-2', 'default')
    expect(q1).not.toBe(q2)
    expect(q1).toContain('tenant-1')
    expect(q2).toContain('tenant-2')
  })
})

describe('createJobPayload()', () => {
  it('captures site context snapshot in payload', () => {
    const payload = createJobPayload(
      'tenant-1',
      'send-email',
      { to: 'user@test.com' },
      'user-1',
    )
    expect(payload.siteId).toBe('tenant-1')
    expect(payload.jobName).toBe('send-email')
    expect(payload.data).toEqual({ to: 'user@test.com' })
    expect(payload.userId).toBe('user-1')
    expect(payload.enqueuedAt).toBeTruthy()
  })

  it('never contains raw DB credentials', () => {
    const payload = createJobPayload(
      'tenant-1',
      'test-job',
      { dbUrl: 'postgres://user:pass@host/db', password: 'secret123' },
      'user-1',
    )
    // The data is the user's data — we don't strip it at creation.
    // But the payload itself must not contain a db_url or connection string field.
    expect(payload).not.toHaveProperty('dbUrl')
    expect(payload).not.toHaveProperty('db_url')
    expect(payload).not.toHaveProperty('connectionString')
    // siteId is just a string identifier, not a connection string
    expect(payload.siteId).toBe('tenant-1')
    expect(payload.siteId).not.toContain('postgres://')
  })

  it('includes timestamp', () => {
    const payload = createJobPayload('t1', 'j1', {}, 'u1')
    const ts = new Date(payload.enqueuedAt).getTime()
    expect(ts).toBeGreaterThan(0)
    expect(Date.now() - ts).toBeLessThan(1000) // within 1 second
  })
})

describe('validateJobContext()', () => {
  it('accepts a valid payload', () => {
    const payload: JobPayload = {
      siteId: 'tenant-1',
      jobName: 'test',
      data: {},
      enqueuedAt: new Date().toISOString(),
      userId: 'user-1',
    }
    expect(() => {
      validateJobContext(payload)
    }).not.toThrow()
  })

  it('rejects payload with missing siteId', () => {
    expect(() => {
      validateJobContext({ jobName: 'test', data: {}, enqueuedAt: new Date().toISOString() } as JobPayload)
    }).toThrow()
  })

  it('rejects payload with missing jobName', () => {
    expect(() => {
      validateJobContext({ siteId: 't1', data: {}, enqueuedAt: new Date().toISOString() } as JobPayload)
    }).toThrow()
  })

  it('rejects payload with missing enqueuedAt', () => {
    expect(() => {
      validateJobContext({ siteId: 't1', jobName: 'j1', data: {} } as JobPayload)
    }).toThrow()
  })
})

describe('QueueManager', () => {
  let manager: QueueManager

  beforeEach(() => {
    manager = new QueueManager()
  })

  it('returns queue name for a site and priority', () => {
    const name = manager.getQueueName('tenant-1', 'default')
    expect(name).toBe('tenant-1:forge:default')
  })

  it('tracks all three priority levels', () => {
    const priorities: QueuePriority[] = ['high', 'default', 'low']
    for (const p of priorities) {
      const name = manager.getQueueName('tenant-1', p)
      expect(name).toContain(p)
    }
  })

  it('builds retry config with exponential backoff', () => {
    const config = manager.getRetryConfig()
    expect(config.attempts).toBe(3)
    expect(config.backoff.type).toBe('exponential')
  })
})
