/**
 * Prisma singleton.
 * Only instantiates PrismaClient when DATABASE_URL is configured.
 * All callers must check `prisma !== null` before using.
 */

import { hasDatabase } from '../config/env.js';
import { logger } from './logger.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _prisma: any | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPrisma(): Promise<any | null> {
  if (!hasDatabase) return null;
  if (_prisma) return _prisma;

  try {
    const { PrismaClient } = await import('@prisma/client');
    _prisma = new PrismaClient({ log: [{ emit: 'event', level: 'error' }] });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await _prisma.$connect();
    logger.info('Prisma: connected to database');
  } catch (err) {
    logger.error({ err }, 'Prisma: failed to connect, continuing without DB');
    _prisma = null;
  }
  return _prisma;
}

/** Synchronous getter — only safe after getPrisma() has resolved once. */
export function prismaSync(): null {
  return _prisma;
}
