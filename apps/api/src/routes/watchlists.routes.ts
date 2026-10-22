/**
 * Price watchlist routes.
 *
 * GET    /api/watchlists      — list active price watches
 * POST   /api/watchlists      — create a price watch
 * DELETE /api/watchlists/:id  — remove a price watch
 *
 * All routes require authentication.
 * Without DB, uses in-memory cache.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { guestAuth } from '../auth/index.js';
import { getCache, CacheKeys, CacheTTL } from '../lib/cache.js';
import { getPrisma } from '../lib/prisma.js';
import { resolveProducts } from '../services/productIndex.js';
import { logEvent, logger } from '../lib/logger.js';

export interface PriceWatch {
  id: string;
  userId: string;
  productId: string;
  targetPrice: number;
  status: 'active' | 'triggered' | 'cancelled';
  createdAt: string;
}

async function getWatches(userId: string): Promise<PriceWatch[]> {
  const prisma = await getPrisma();
  if (prisma) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const records = await prisma.priceWatch.findMany({ where: { userId } });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return records.map((r: Omit<PriceWatch, 'createdAt'> & { createdAt: Date }) => ({
        id: r.id,
        userId: r.userId,
        productId: r.productId,
        targetPrice: r.targetPrice,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }));
    } catch (err) {
      logger.warn({ err, userId }, 'DB watchlist fetch failed');
    }
  }
  const cache = await getCache();
  return (await cache.get<PriceWatch[]>(CacheKeys.watchlists(userId))) ?? [];
}

async function addWatch(userId: string, productId: string, targetPrice: number): Promise<PriceWatch> {
  const prisma = await getPrisma();
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  if (prisma) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const record = await prisma.priceWatch.create({
        data: { id, userId, productId, targetPrice, status: 'active' },
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        id: record.id as string,
        userId,
        productId,
        targetPrice,
        status: 'active',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : createdAt,
      };
    } catch (err) {
      logger.warn({ err, userId }, 'DB watch add failed');
    }
  }

  const watch: PriceWatch = { id, userId, productId, targetPrice, status: 'active', createdAt };
  const cache = await getCache();
  const current = (await cache.get<PriceWatch[]>(CacheKeys.watchlists(userId))) ?? [];
  current.push(watch);
  await cache.set(CacheKeys.watchlists(userId), current, CacheTTL.saved);
  return watch;
}

async function removeWatch(userId: string, watchId: string): Promise<void> {
  const prisma = await getPrisma();
  if (prisma) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await prisma.priceWatch.deleteMany({ where: { id: watchId, userId } });
      return;
    } catch (err) {
      logger.warn({ err, userId }, 'DB watch remove failed');
    }
  }
  const cache = await getCache();
  const current = (await cache.get<PriceWatch[]>(CacheKeys.watchlists(userId))) ?? [];
  await cache.set(
    CacheKeys.watchlists(userId),
    current.filter((w) => w.id !== watchId),
    CacheTTL.saved,
  );
}

const CreateWatchSchema = z.object({
  productId: z.string().min(1),
  targetPrice: z.number().positive(),
});

export async function watchlistRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/watchlists — each watch enriched with its canonical product.
  app.get(
    '/watchlists',
    { preHandler: guestAuth },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = req.user!.id;
      try {
        const watches = await getWatches(userId);
        const products = await resolveProducts(watches.map((w) => w.productId));
        const byId = new Map(products.map((p) => [p.id, p]));
        const enriched = watches
          .map((w) => {
            const product = byId.get(w.productId);
            return product
              ? { id: w.id, productId: w.productId, targetPrice: w.targetPrice, status: w.status, product }
              : null;
          })
          .filter(Boolean);
        return reply.send(enriched);
      } catch (err) {
        logger.error({ err, userId }, 'Get watchlists failed');
        return reply.code(500).send({ error: 'Failed to retrieve watchlists' });
      }
    },
  );

  // POST /api/watchlists
  app.post(
    '/watchlists',
    { preHandler: guestAuth },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = req.user!.id;
      const parsed = CreateWatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Invalid request', issues: parsed.error.flatten().fieldErrors });
      }
      const { productId, targetPrice } = parsed.data;
      try {
        const watch = await addWatch(userId, productId, targetPrice);
        logEvent('price_watch_created', { userId, productId, targetPrice });
        return reply.code(201).send(watch);
      } catch (err) {
        logger.error({ err, userId }, 'Create watch failed');
        return reply.code(500).send({ error: 'Failed to create price watch' });
      }
    },
  );

  // DELETE /api/watchlists/:id
  app.delete<{ Params: { id: string } }>(
    '/watchlists/:id',
    { preHandler: guestAuth },
    async (req, reply) => {
      const userId = req.user!.id;
      const { id: watchId } = req.params;
      try {
        await removeWatch(userId, watchId);
        return reply.send({ success: true });
      } catch (err) {
        logger.error({ err, userId, watchId }, 'Remove watch failed');
        return reply.code(500).send({ error: 'Failed to remove price watch' });
      }
    },
  );
}
