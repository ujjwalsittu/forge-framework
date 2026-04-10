/**
 * Queue system type definitions.
 */

export type QueuePriority = 'high' | 'default' | 'low'

export interface JobPayload {
  readonly siteId: string
  readonly jobName: string
  readonly data: unknown
  readonly enqueuedAt: string
  readonly userId?: string | undefined
}

export interface RetryConfig {
  readonly attempts: number
  readonly backoff: {
    readonly type: 'exponential'
    readonly delay: number
  }
}
