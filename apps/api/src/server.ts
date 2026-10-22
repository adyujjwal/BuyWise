/**
 * Fastify server entry point.
 *
 * buildServer() — constructs and returns the configured Fastify app.
 * start()       — builds the server and starts listening.
 *
 * Export buildServer for testability (import without starting the listener).
 */

import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply, type FastifyError } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { authPlugin } from './auth/index.js';
import { researchRoutes } from './routes/research.routes.js';
import { productRoutes } from './routes/products.routes.js';
import { preferencesRoutes } from './routes/preferences.routes.js';
import { savedRoutes } from './routes/saved.routes.js';
import { watchlistRoutes } from './routes/watchlists.routes.js';
import { historyRoutes } from './routes/history.routes.js';
import { healthRoutes } from './routes/health.routes.js';

export async function buildServer() {
  const app = Fastify({
    logger,
    trustProxy: true,
  });

  // ── Plugins ───────────────────────────────────────────────────────────────

  await app.register(cookie, { secret: env.SESSION_SECRET });

  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(rateLimit as any, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: (_req: FastifyRequest, context: { ttl: number }) => ({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
      statusCode: 429,
    }),
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  await app.register(authPlugin);

  // ── Routes ────────────────────────────────────────────────────────────────
  // Research has its own tighter rate limit
  await app.register(
    async (instance: FastifyInstance) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await instance.register(rateLimit as any, {
        max: 20,
        timeWindow: '1 minute',
        keyGenerator: (req: FastifyRequest) =>
          req.user?.id ?? req.ip ?? 'anonymous',
        errorResponseBuilder: (_req: FastifyRequest, context: { ttl: number }) => ({
          error: 'Too Many Requests',
          message: `Research rate limit: try again in ${Math.ceil(context.ttl / 1000)}s.`,
          statusCode: 429,
        }),
      });
      await instance.register(researchRoutes);
    },
    { prefix: '/api' },
  );

  await app.register(productRoutes, { prefix: '/api' });
  await app.register(preferencesRoutes, { prefix: '/api' });
  await app.register(savedRoutes, { prefix: '/api' });
  await app.register(watchlistRoutes, { prefix: '/api' });
  await app.register(historyRoutes, { prefix: '/api' });
  await app.register(healthRoutes, { prefix: '/api' });

  // ── Error handler ────────────────────────────────────────────────────────
  app.setErrorHandler((error: FastifyError, _req: FastifyRequest, reply: FastifyReply) => {
    // Log full error server-side (includes stack)
    logger.error({ err: error }, 'Unhandled error');

    // Zod validation errors
    if (error instanceof ZodError) {
      void reply.code(400).send({
        error: 'Validation Error',
        issues: error.flatten().fieldErrors,
      });
      return;
    }

    // Fastify validation errors
    if (error.statusCode === 400) {
      void reply.code(400).send({ error: 'Bad Request', message: error.message });
      return;
    }

    // Rate limit
    if (error.statusCode === 429) {
      void reply.code(429).send({ error: 'Too Many Requests', message: error.message });
      return;
    }

    // Unauthorized
    if (error.statusCode === 401) {
      void reply.code(401).send({ error: 'Unauthorized', message: error.message });
      return;
    }

    // Generic 500 — never leak stack or secrets to client
    void reply.code(error.statusCode ?? 500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again.',
    });
  });

  // ── 404 handler ──────────────────────────────────────────────────────────
  app.setNotFoundHandler((_req: FastifyRequest, reply: FastifyReply) => {
    void reply.code(404).send({ error: 'Not Found', message: 'Route not found.' });
  });

  return app;
}

export async function start(): Promise<void> {
  try {
    const app = await buildServer();
    const address = await app.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(
      {
        address,
        demoMode: !process.env['OPENAI_API_KEY'],
        hasDB: Boolean(process.env['DATABASE_URL']),
      },
      'BuyWise API listening',
    );
  } catch (err) {
    logger.fatal({ err }, 'Server failed to start');
    process.exit(1);
  }
}

// Run when executed directly
start();
