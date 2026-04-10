/**
 * Fastify application factory.
 *
 * Creates a configured Fastify instance with:
 * - @fastify/helmet (security headers)
 * - @fastify/cors
 * - @fastify/rate-limit
 * - Custom error handler (no stack traces to client)
 * - Auto-generated resource routes
 * - 10MB body size limit
 */
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import type { SchemaRegistry } from '../schema/registry'
import { registerResourceRoutes } from './routes/resource'
import { registerErrorHandler } from './plugins/error-handler'

const BODY_LIMIT = 10 * 1024 * 1024 // 10MB

export interface ServerOptions {
  readonly logger?: boolean
  readonly corsOrigins?: readonly string[]
}

/**
 * Create a production Fastify server with all plugins configured.
 */
export async function createForgeServer(
  registry: SchemaRegistry,
  options?: ServerOptions,
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options?.logger ?? false,
    bodyLimit: BODY_LIMIT,
  })

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // Configured per-route in production
    xFrameOptions: { action: 'deny' },
  })

  // CORS — explicit whitelist, never '*' in production
  await app.register(cors, {
    origin: options?.corsOrigins
      ? [...options.corsOrigins]
      : false,
  })

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // Error handler — generic messages to client
  registerErrorHandler(app)

  // Auto-generated CRUD routes
  registerResourceRoutes(app, registry)

  return app
}

/**
 * Create a test-configured Fastify instance (no logging, no CORS, in-memory).
 */
export async function createTestApp(
  registry: SchemaRegistry,
): Promise<FastifyInstance> {
  return createForgeServer(registry, { logger: false })
}
