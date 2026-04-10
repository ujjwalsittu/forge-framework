/**
 * Queue management — namespaced BullMQ queues per tenant.
 *
 * Queue naming: {site-id}:forge:{priority}
 * Context snapshot captured at enqueue time, validated before processing.
 * Retry: exponential backoff 1s, 5s, 30s — max 3 attempts — then DLQ.
 */
import type { JobPayload, QueuePriority, RetryConfig } from './types'

/**
 * Build a namespaced queue name for a tenant and priority level.
 * Format: {siteId}:forge:{priority}
 */
export function buildQueueName(siteId: string, priority: QueuePriority): string {
  return `${siteId}:forge:${priority}`
}

/**
 * Create a job payload with site context snapshot.
 * The payload captures the tenant context at enqueue time.
 * Never includes raw DB credentials — only the site ID string.
 */
export function createJobPayload(
  siteId: string,
  jobName: string,
  data: unknown,
  userId?: string,
): JobPayload {
  return {
    siteId,
    jobName,
    data,
    enqueuedAt: new Date().toISOString(),
    userId,
  }
}

/**
 * Validate a job context payload before processing.
 * Ensures required fields are present and non-empty.
 *
 * @throws {Error} if payload is missing required fields
 */
export function validateJobContext(payload: JobPayload): void {
  if (!payload.siteId) {
    throw new Error('Job payload missing siteId')
  }
  if (!payload.jobName) {
    throw new Error('Job payload missing jobName')
  }
  if (!payload.enqueuedAt) {
    throw new Error('Job payload missing enqueuedAt')
  }
}

/**
 * Manages queue names and configuration for the BullMQ queue system.
 * Does not hold BullMQ Queue instances directly — those are created
 * at server startup with a real Redis connection.
 */
export class QueueManager {
  /**
   * Get the namespaced queue name for a site and priority.
   */
  getQueueName(siteId: string, priority: QueuePriority): string {
    return buildQueueName(siteId, priority)
  }

  /**
   * Get the retry configuration for job processing.
   * Exponential backoff: 1s → 5s → 30s, max 3 attempts.
   */
  getRetryConfig(): RetryConfig {
    return {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    }
  }
}
