/**
 * User preferences routes.
 *
 * GET /api/preferences   — get current user preferences
 * PUT /api/preferences   — update preferences
 *
 * Both routes require authentication.
 * Without a DB, preferences are stored in the in-memory cache.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserPreferencesSchema, type UserPreferences } from '@buywise/shared';
import { guestAuth } from '../auth/index.js';
import { getCache, CacheKeys, CacheTTL } from '../lib/cache.js';
import { getPrisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultCurrency: 'INR',
  priorities: [],
  brandAffinity: 'low',
  budgetSensitivity: 'medium',
};

async function getPreferences(userId: string): Promise<UserPreferences> {
  // Try DB first
  const prisma = await getPrisma();
  if (prisma) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const record = await prisma.userPreference.findUnique({ where: { userId } });
      if (record) {
        return UserPreferencesSchema.parse(record);
      }
    } catch (err) {
      logger.warn({ err, userId }, 'DB preference fetch failed');
    }
  }

  // Fallback: in-memory cache
  const cache = await getCache();
  const cached = await cache.get<UserPreferences>(CacheKeys.userPrefs(userId));
  return cached ?? DEFAULT_PREFERENCES;
}

async function savePreferences(userId: string, prefs: UserPreferences): Promise<void> {
  // Try DB first
  const prisma = await getPrisma();
  if (prisma) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await prisma.userPreference.upsert({
        where: { userId },
        update: {
          priorities: prefs.priorities as object,
          brandAffinity: prefs.brandAffinity,
          budgetSensitivity: prefs.budgetSensitivity,
          defaultCurrency: prefs.defaultCurrency,
        },
        create: {
          userId,
          priorities: prefs.priorities as object,
          brandAffinity: prefs.brandAffinity,
          budgetSensitivity: prefs.budgetSensitivity,
          defaultCurrency: prefs.defaultCurrency,
        },
      });
      return;
    } catch (err) {
      logger.warn({ err, userId }, 'DB preference save failed, using cache');
    }
  }

  // Fallback: in-memory cache
  const cache = await getCache();
  await cache.set(CacheKeys.userPrefs(userId), prefs, CacheTTL.userPrefs);
}

export async function preferencesRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/preferences
  app.get(
    '/preferences',
    { preHandler: guestAuth },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = req.user!.id;
      try {
        const prefs = await getPreferences(userId);
        return reply.send(prefs);
      } catch (err) {
        logger.error({ err, userId }, 'Get preferences failed');
        return reply.code(500).send({ error: 'Failed to retrieve preferences' });
      }
    },
  );

  // PUT /api/preferences
  app.put(
    '/preferences',
    { preHandler: guestAuth },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = req.user!.id;
      const parsed = UserPreferencesSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Invalid preferences',
          issues: parsed.error.flatten().fieldErrors,
        });
      }

      try {
        await savePreferences(userId, parsed.data);
        return reply.send(parsed.data);
      } catch (err) {
        logger.error({ err, userId }, 'Save preferences failed');
        return reply.code(500).send({ error: 'Failed to save preferences' });
      }
    },
  );
}
