/**
 * Brute force protection — in-memory counter with lockout.
 *
 * Production: Redis-backed (uses NamespacedCache).
 * Testing/dev: in-memory Map (this implementation).
 *
 * 5 failures → 15-minute lockout per user.
 */

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes

interface AttemptRecord {
  failures: number
  lockedUntil: number | null
}

export class BruteForceProtection {
  private readonly attempts = new Map<string, AttemptRecord>()

  private getOrCreate(key: string): AttemptRecord {
    let record = this.attempts.get(key)
    if (!record) {
      record = { failures: 0, lockedUntil: null }
      this.attempts.set(key, record)
    }
    return record
  }

  /**
   * Check if a user is currently locked out.
   */
  isLocked(key: string): boolean {
    const record = this.attempts.get(key)
    if (!record) return false

    if (record.lockedUntil !== null && Date.now() < record.lockedUntil) {
      return true
    }

    // Lock expired — reset
    if (record.lockedUntil !== null && Date.now() >= record.lockedUntil) {
      record.failures = 0
      record.lockedUntil = null
    }

    return record.failures >= MAX_ATTEMPTS
  }

  /**
   * Check if locked, throw if so.
   */
  checkOrThrow(key: string): void {
    if (this.isLocked(key)) {
      throw new Error('Too many failed attempts. Please try again later.')
    }
  }

  /**
   * Record a failed authentication attempt.
   */
  recordFailure(key: string): void {
    const record = this.getOrCreate(key)
    record.failures++
    if (record.failures >= MAX_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_MS
    }
  }

  /**
   * Record a successful authentication — resets the counter.
   */
  recordSuccess(key: string): void {
    this.attempts.delete(key)
  }
}
