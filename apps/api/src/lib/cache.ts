/**
 * Tiny cache abstraction.
 *
 * - If REDIS_URL is set: uses ioredis (production-grade, shared across instances).
 * - Otherwise: in-process Map with TTL eviction (works fine for single-instance demo).
 *
 * Values are stored as serialized JSON strings.
 */

import { env } from '../config/env.js';
import { logger } from './logger.js';

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

// ── In-memory implementation ───────────────────────────────────────────────

interface MemEntry {
  value: string;
  expiresAt: number; // epoch ms, 0 = never
}

class InMemoryCache implements CacheStore {
  private store = new Map<string, MemEntry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 0): Promise<void> {
    this.store.set(key, {
      value: JSON.stringify(value),
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// ── Redis implementation ───────────────────────────────────────────────────

class RedisCache implements CacheStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any; // ioredis Redis type — dynamic import

  constructor(client: unknown) {
    this.client = client;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      if (raw == null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.warn({ err, key }, 'Redis get failed, returning null');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 0): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err) {
      logger.warn({ err, key }, 'Redis set failed, continuing without cache');
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      logger.warn({ err, key }, 'Redis del failed');
    }
  }
}

// ── Factory ────────────────────────────────────────────────────────────────

async function createCache(): Promise<CacheStore> {
  if (env.REDIS_URL) {
    try {
      const { Redis } = await import('ioredis');
      const client = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
      await client.connect();
      logger.info('Cache: connected to Redis');
      return new RedisCache(client);
    } catch (err) {
      logger.warn({ err }, 'Redis connection failed, falling back to in-memory cache');
    }
  }
  logger.info('Cache: using in-memory store');
  return new InMemoryCache();
}

// Singleton promise
let _cache: CacheStore | null = null;

export async function getCache(): Promise<CacheStore> {
  if (!_cache) {
    _cache = await createCache();
  }
  return _cache;
}

/** Convenience: cache keys. */
export const CacheKeys = {
  research: (id: string) => `research:${id}`,
  userPrefs: (userId: string) => `prefs:${userId}`,
  savedProducts: (userId: string) => `saved:${userId}`,
  watchlists: (userId: string) => `watchlists:${userId}`,
};

/** TTLs in seconds. */
export const CacheTTL = {
  research: 60 * 60 * 6, // 6 hours
  userPrefs: 60 * 60 * 24, // 24 hours
  saved: 60 * 60 * 24, // 24 hours
};
