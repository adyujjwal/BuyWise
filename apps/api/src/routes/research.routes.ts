/**
 * Research routes.
 *
 * POST   /api/research        — start a new research session
 * GET    /api/research/:id    — get results by session ID
 * POST   /api/research/:id/what-if — rerun with different weights/budget
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StartResearchSchema, WhatIfSchema } from '@buywise/shared';
import { runResearch, getResearchSession, applyWhatIf } from '../services/research.js';
import { optionalAuth } from '../auth/index.js';
import { logger } from '../lib/logger.js';

export async function researchRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/research — anonymous-friendly, personalizes when signed in.
  app.post('/research', { preHandler: optionalAuth }, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = StartResearchSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({
        error: 'Invalid request',
        issues: body.error.flatten().fieldErrors,
      });
    }

    const { query, category, demo } = body.data;
    const userId = req.user?.id;

    try {
      const result = await runResearch(query, {
        userId,
        demo: demo ?? !userId,
        categoryHint: category,
      });
      return reply.code(200).send(result);
    } catch (err) {
      logger.error({ err, query }, 'Research failed');
      return reply.code(500).send({ error: 'Research failed', message: 'An internal error occurred.' });
    }
  });

  // GET /api/research/:id
  app.get(
    '/research/:id',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;
      try {
        const result = await getResearchSession(id);
        if (!result) {
          return reply.code(404).send({ error: 'Not found', message: 'Session not found or expired.' });
        }
        return reply.send(result);
      } catch (err) {
        logger.error({ err, id }, 'Get research session failed');
        return reply.code(500).send({ error: 'Failed to retrieve session' });
      }
    },
  );

  // POST /api/research/:id/what-if
  app.post(
    '/research/:id/what-if',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;
      const body = WhatIfSchema.safeParse({ sessionId: id, ...(req.body as object) });
      if (!body.success) {
        return reply.code(400).send({
          error: 'Invalid request',
          issues: body.error.flatten().fieldErrors,
        });
      }

      try {
        const result = await applyWhatIf(id, {
          budgetMax: body.data.budgetMax,
          priorities: body.data.priorities,
        });
        return reply.send(result);
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          'statusCode' in err &&
          (err as { statusCode: number }).statusCode === 404
        ) {
          return reply
            .code(404)
            .send({ error: 'Session not found', message: 'Session expired or not found.' });
        }
        logger.error({ err, id }, 'What-if failed');
        return reply.code(500).send({ error: 'What-if analysis failed' });
      }
    },
  );
}
