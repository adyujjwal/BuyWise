/**
 * Saved products routes.
 *
 * GET    /api/saved         — list saved product IDs
 * POST   /api/saved         — save a product
 * DELETE /api/saved/:id     — remove a saved product
 *
 * All routes require authentication.
 * Without DB, uses in-memory cache keyed by userId.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { guestAuth } from '../auth/index.js';
import { getCache, CacheKeys, CacheTTL } from '../lib/cache.js';
import { getPrisma } from '../lib/prisma.js';
import { resolveProducts } from '../services/productIndex.js';
import { logEvent, logger } from '../lib/logger.js';

async function getSaved(userId: string): Promise<string[]> {
  const prisma = await getPrisma();
  if (prisma) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const records = await prisma.savedProduct.findMany({
        where: { userId },
        select: { productId: true },
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return records.map((r: { productId: string }) => r.productId);
    } catch (err) {
      logger.warn({ err, userId }, 'DB saved fetch failed');
    }
  }
  const cache = await getCache();
  return (await cache.get<string[]>(CacheKeys.savedProducts(userId))) ?? [];
}

async function addSaved(userId: string, productId: string): Promise<void> {
  const prisma = await getPrisma();
  if (prisma) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await prisma.savedProduct.upsert({
        where: { userId_productId: { userId, productId } },
        update: {},
        create: { userId, productId },
      });
      return;
    } catch (err) {
      logger.warn({ err, userId }, 'DB saved add failed');
    }
  }
  const cache = await getCache();
  const current = (await cache.get<string[]>(CacheKeys.savedProducts(userId))) ?? [];
  if (!current.includes(productId)) {
    current.push(productId);
    await cache.set(CacheKeys.savedProducts(userId), current, CacheTTL.saved);
  }
}

async function removeSaved(userId: string, productId: string): Promise<void> {
  const prisma = await getPrisma();
  if (prisma) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await prisma.savedProduct.deleteMany({ where: { userId, productId } });
      return;
    } catch (err) {
      logger.warn({ err, userId }, 'DB saved remove failed');
    }
  }
  const cache = await getCache();
  const current = (await cache.get<string[]>(CacheKeys.savedProducts(userId))) ?? [];
  await cache.set(
    CacheKeys.savedProducts(userId),
    current.filter((id) => id !== productId),
    CacheTTL.saved,
  );
}

const SaveBodySchema = z.object({ productId: z.string().min(1) });

export async function savedRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/saved — returns full canonical products (with offers/prices).
  app.get('/saved', { preHandler: guestAuth }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    try {
      const ids = await getSaved(userId);
      const products = await resolveProducts(ids);
      return reply.send(products);
    } catch (err) {
      logger.error({ err, userId }, 'Get saved failed');
      return reply.code(500).send({ error: 'Failed to retrieve saved products' });
    }
  });

  // POST /api/saved
  app.post('/saved', { preHandler: guestAuth }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const parsed = SaveBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'Invalid request', issues: parsed.error.flatten().fieldErrors });
    }
    const { productId } = parsed.data;
    try {
      await addSaved(userId, productId);
      logEvent('product_saved', { userId, productId });
      return reply.code(201).send({ success: true, productId });
    } catch (err) {
      logger.error({ err, userId, productId }, 'Save product failed');
      return reply.code(500).send({ error: 'Failed to save product' });
    }
  });

  // DELETE /api/saved/:id
  app.delete<{ Params: { id: string } }>(
    '/saved/:id',
    { preHandler: guestAuth },
    async (req, reply) => {
      const userId = req.user!.id;
      const { id: productId } = req.params;
      try {
        await removeSaved(userId, productId);
        return reply.send({ success: true });
      } catch (err) {
        logger.error({ err, userId, productId }, 'Remove saved failed');
        return reply.code(500).send({ error: 'Failed to remove saved product' });
      }
    },
  );
}
