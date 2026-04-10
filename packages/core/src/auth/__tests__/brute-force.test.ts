import { describe, it, expect, beforeEach } from 'vitest'
import { BruteForceProtection } from '../brute-force'

describe('Brute force protection', () => {
  let protection: BruteForceProtection

  beforeEach(() => {
    protection = new BruteForceProtection()
  })

  it('allows attempts under the limit', () => {
    expect(protection.isLocked('user-1')).toBe(false)
    protection.recordFailure('user-1')
    protection.recordFailure('user-1')
    expect(protection.isLocked('user-1')).toBe(false)
  })

  it('locks after 5 failed attempts', () => {
    for (let i = 0; i < 5; i++) {
      protection.recordFailure('user-1')
    }
    expect(protection.isLocked('user-1')).toBe(true)
  })

  it('lockout is per-user, not global', () => {
    for (let i = 0; i < 5; i++) {
      protection.recordFailure('user-1')
    }
    expect(protection.isLocked('user-1')).toBe(true)
    expect(protection.isLocked('user-2')).toBe(false)
  })

  it('successful login resets counter', () => {
    for (let i = 0; i < 4; i++) {
      protection.recordFailure('user-1')
    }
    protection.recordSuccess('user-1')
    expect(protection.isLocked('user-1')).toBe(false)
    // Should need 5 more failures to lock again
    for (let i = 0; i < 4; i++) {
      protection.recordFailure('user-1')
    }
    expect(protection.isLocked('user-1')).toBe(false)
  })

  it('returns lockout error message when locked', () => {
    for (let i = 0; i < 5; i++) {
      protection.recordFailure('user-1')
    }
    expect(() => {
      protection.checkOrThrow('user-1')
    }).toThrow('Too many failed attempts')
  })
})
