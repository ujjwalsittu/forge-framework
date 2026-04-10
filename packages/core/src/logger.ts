/**
 * Structured JSON logger with secret redaction.
 *
 * Redacted fields: password, api_key, db_url, token, secret, authorization
 * These are replaced with '[REDACTED]' in all log output.
 */
import pino from 'pino'

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  redact: {
    paths: [
      'password',
      'api_key',
      'db_url',
      'token',
      'secret',
      'authorization',
      'req.headers.authorization',
      '*.password',
      '*.api_key',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
})
