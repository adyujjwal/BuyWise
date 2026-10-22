/**
 * Pino structured logger with pretty-printing in development.
 * Never log secrets, full JWTs, or PII (email/name in plain form).
 */

import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino(
  {
    level: env.NODE_ENV === 'test' ? 'silent' : 'info',
    // Redact common PII / secret paths
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'body.password',
        'body.token',
        'googleAccessToken',
        'accessToken',
      ],
      censor: '[REDACTED]',
    },
    base: { service: 'buywise-api', env: env.NODE_ENV },
  },
  env.NODE_ENV === 'development'
    ? pino.transport({ target: 'pino-pretty', options: { colorize: true, singleLine: false } })
    : undefined,
);

// ── Observability events ──────────────────────────────────────────────────────

export type ObservabilityEvent =
  | 'research_started'
  | 'research_completed'
  | 'tool_called'
  | 'tool_failed'
  | 'recommendation_generated'
  | 'product_saved'
  | 'price_watch_created';

/**
 * Log a structured observability event.
 * @param event  One of the well-known event identifiers.
 * @param fields Extra structured data (avoid PII — use IDs not names/emails).
 */
export function logEvent(
  event: ObservabilityEvent,
  fields: Record<string, unknown> = {},
): void {
  logger.info({ event, ...fields });
}
