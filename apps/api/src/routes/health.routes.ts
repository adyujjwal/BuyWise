/**
 * Health check route.
 *
 * GET /api/health — system status and feature flags.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { hasOpenAI, hasDatabase, hasGoogleOAuth } from '../config/env.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      demoMode: !hasOpenAI,
      hasOpenAI,
      hasDatabase,
      hasGoogleOAuth,
      timestamp: new Date().toISOString(),
    });
  });
}
