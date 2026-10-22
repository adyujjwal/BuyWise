/**
 * History routes.
 *
 * GET /api/history — past research sessions for the authenticated user.
 *   Uses the database when configured; otherwise the in-memory per-user
 *   history recorded by the research service (so the demo works without a DB).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { bestOfferPrice, type ResearchResult } from '@buywise/shared';
import { guestAuth } from '../auth/index.js';
import { getPrisma } from '../lib/prisma.js';
import { listUserHistory, type HistoryEntry } from '../services/research.js';
import { logger } from '../lib/logger.js';

async function getHistory(userId: string): Promise<HistoryEntry[]> {
  const prisma = await getPrisma();
  if (prisma) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const sessions = await prisma.researchSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      if (sessions.length > 0) {
        return sessions.map(
          (s: { id: string; query: string; category: string; createdAt: Date; resultJson: unknown }) => {
            const result = s.resultJson as ResearchResult | null;
            const winnerId = result?.recommendation?.productId;
            const winner = winnerId ? result?.products.find((p) => p.id === winnerId) : undefined;
            return {
              id: s.id,
              query: s.query,
              category: s.category as HistoryEntry['category'],
              createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
              bestMatchName: winner?.canonicalName ?? '—',
              bestMatchPrice: winner ? bestOfferPrice(winner) : null,
              bestMatchScore: result?.recommendation?.score.overall ?? 0,
            };
          },
        );
      }
    } catch (err) {
      logger.warn({ err, userId }, 'DB history fetch failed; using in-memory history');
    }
  }
  // No DB (or empty) — in-memory history keeps the demo working.
  return listUserHistory(userId);
}

export async function historyRoutes(app: FastifyInstance): Promise<void> {
  app.get('/history', { preHandler: guestAuth }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    try {
      return reply.send(await getHistory(userId));
    } catch (err) {
      logger.error({ err, userId }, 'Get history failed');
      return reply.code(500).send({ error: 'Failed to retrieve history' });
    }
  });
}
