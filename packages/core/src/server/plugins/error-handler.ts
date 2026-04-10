/**
 * Error handler plugin — generic messages to client, full details to server logs.
 * Stack traces are NEVER sent to the client.
 */
import type { FastifyInstance, FastifyError } from 'fastify'

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? 500

    // Never leak stack traces or internal details to client
    const response = {
      message: statusCode >= 500
        ? 'Internal server error'
        : error.message,
      data: null,
    }

    void reply.status(statusCode).send(response)
  })
}
