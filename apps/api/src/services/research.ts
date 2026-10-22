/**
 * Research orchestration service.
 *
 * runResearch(query, options) → ResearchResult:
 *   1. Detect category
 *   2. Query all sources (capture SourceStatus)
 *   3. Normalize to CanonicalProduct[]
 *   4. Extract Requirements (AI or fallback)
 *   5. deriveWeights → scoreAll
 *   6. Pick winner, alternatives, dontBuy
 *   7. Build Recommendation prose (AI or fallback)
 *   8. Assemble ResearchResult
 *   9. Cache by sessionId
 *   10. Persist to DB if available (best-effort)
 *
 * applyWhatIf(sessionId, {budgetMax?, priorities?}) → new ResearchResult
 *   Reloads cached products + requirements, re-scores, re-generates prose.
 */

import { randomUUID } from 'crypto';
import {
  detectCategory,
  deriveWeights,
  scoreAll,
  pickAlternatives,
  deriveDontBuy,
  bestOfferPrice,
  CATEGORY_DIMENSIONS,
  type CanonicalProduct,
  type Category,
  type Recommendation,
  type Requirements,
  type ResearchResult,
  type SourceStatus,
} from '@buywise/shared';
import { getSources } from '../sources/index.js';
import type { RawProduct, RawOffer } from '../sources/ProductSource.js';
import { normalizeProducts } from './normalization.js';
import { getCache, CacheKeys, CacheTTL } from '../lib/cache.js';
import { logEvent, logger } from '../lib/logger.js';
import { getPrisma } from '../lib/prisma.js';
import { hasOpenAI } from '../config/env.js';
import {
  extractRequirements as aiExtract,
  buildRecommendation as aiBuildRecommendation,
} from '../agent/agent.js';
import {
  fallbackExtractRequirements,
  fallbackBuildRecommendation,
} from '../agent/fallback.js';

// ── Internal session cache shape ──────────────────────────────────────────

interface CachedSession {
  result: ResearchResult;
  products: CanonicalProduct[];
  requirements: Requirements;
}

/** Lightweight history row surfaced on the History / Home screens. */
export interface HistoryEntry {
  id: string;
  query: string;
  category: Category;
  createdAt: string;
  bestMatchName: string;
  bestMatchPrice: number | null;
  bestMatchScore: number;
}

/**
 * In-memory per-user research history. Powers History/Home in demo mode (no DB).
 * When a database is configured the history routes read from it instead.
 */
const userHistory = new Map<string, HistoryEntry[]>();

function recordHistory(userId: string, entry: HistoryEntry): void {
  const list = userHistory.get(userId) ?? [];
  list.unshift(entry);
  userHistory.set(userId, list.slice(0, 50));
}

/** Most-recent-first history for a user (in-memory; empty if none). */
export function listUserHistory(userId: string): HistoryEntry[] {
  return userHistory.get(userId) ?? [];
}

// ── Research orchestration ─────────────────────────────────────────────────

export interface RunResearchOptions {
  userId?: string;
  demo?: boolean;
  categoryHint?: string;
}

export async function runResearch(
  query: string,
  options: RunResearchOptions = {},
): Promise<ResearchResult> {
  const sessionId = randomUUID();
  const createdAt = new Date().toISOString();

  logEvent('research_started', { sessionId, queryLen: query.length, demo: options.demo ?? false });

  // ── 1. Detect category ──────────────────────────────────────────────────
  const category = options.categoryHint
    ? (options.categoryHint as Requirements['category'])
    : detectCategory(query);

  logger.info({ sessionId, category }, 'Research: category detected');

  // ── 2. Query all sources ─────────────────────────────────────────────────
  const sources = getSources();
  const sourceStatuses: SourceStatus[] = [];
  // We need a preliminary Requirements to pass to searchProducts; use fallback extract
  const prelimReqs = fallbackExtractRequirements(query, category);

  const allRawProducts: RawProduct[] = [];
  const allRawOffers: RawOffer[] = [];

  await Promise.all(
    sources.map(async (source) => {
      try {
        const products = await source.searchProducts(prelimReqs);
        allRawProducts.push(...products);

        // Collect offers from offer sources
        if (source.isOfferSource) {
          const offerPromises = products.map((p) =>
            source.getOffers(p.externalId).catch(() => []),
          );
          const nestedOffers = await Promise.all(offerPromises);
          for (const offers of nestedOffers) allRawOffers.push(...offers);
        }

        sourceStatuses.push({
          id: source.id,
          name: source.name,
          status: 'queried',
          productCount: products.length,
        });
      } catch (err) {
        logger.warn({ err, sourceId: source.id }, 'Source query failed, marking unavailable');
        sourceStatuses.push({
          id: source.id,
          name: source.name,
          status: 'unavailable',
          productCount: 0,
          note: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }),
  );

  logger.info({ sessionId, productCount: allRawProducts.length }, 'Research: sources queried');

  // ── 3. Normalize ─────────────────────────────────────────────────────────
  const products = normalizeProducts(allRawProducts, allRawOffers);
  logger.info({ sessionId, canonicalCount: products.length }, 'Research: normalized');

  // ── 4. Extract requirements ──────────────────────────────────────────────
  let requirements: Requirements;
  try {
    if (hasOpenAI) {
      requirements = await aiExtract(query, category);
    } else {
      requirements = fallbackExtractRequirements(query, category);
    }
  } catch (err) {
    logger.warn({ err }, 'Requirements extraction failed, using fallback');
    requirements = fallbackExtractRequirements(query, category);
  }

  // ── 5. Derive weights + score ────────────────────────────────────────────
  const weights = deriveWeights(category, requirements.priorities);
  const scores = scoreAll(products, category, weights, requirements.budget);

  // Build weights list for response
  const dims = CATEGORY_DIMENSIONS[category];
  const weightsList = dims.map((dim) => ({
    dimension: dim.key,
    label: dim.label,
    weight: weights[dim.key] ?? dim.defaultWeight,
  }));

  // ── 6. Pick winner ───────────────────────────────────────────────────────
  // Prefer within-budget; fall back to overall top if none within budget
  const withinBudget = scores.filter((s) => s.withinBudget);
  const winnerScore = withinBudget.length > 0 ? withinBudget[0]! : scores[0]!;

  if (!winnerScore) {
    throw new Error('No products available for this query');
  }

  const winner = products.find((p) => p.id === winnerScore.productId)!;
  const alternatives = pickAlternatives(products, scores, category, winner.id);
  const dontBuy = deriveDontBuy(products, scores, category, requirements.budget, winner.id);

  // ── 7. Build recommendation prose ───────────────────────────────────────
  let recommendation: Recommendation;
  try {
    if (hasOpenAI) {
      recommendation = await aiBuildRecommendation(winner, winnerScore, requirements, products);
    } else {
      recommendation = fallbackBuildRecommendation(winner, winnerScore, requirements, products);
    }
  } catch (err) {
    logger.warn({ err }, 'AI recommendation failed, using fallback prose');
    recommendation = fallbackBuildRecommendation(winner, winnerScore, requirements, products);
  }

  // ── 8. Assemble result ───────────────────────────────────────────────────
  const result: ResearchResult = {
    sessionId,
    requirements,
    weights: weightsList,
    products,
    scores,
    recommendation,
    alternatives,
    dontBuy,
    sources: sourceStatuses,
    createdAt,
  };

  logEvent('research_completed', {
    sessionId,
    category,
    productCount: products.length,
    winnerId: winner.id,
    score: winnerScore.overall,
  });

  // ── 9. Cache session ─────────────────────────────────────────────────────
  const cache = await getCache();
  const cached: CachedSession = { result, products, requirements };
  await cache.set(CacheKeys.research(sessionId), cached, CacheTTL.research);

  // ── 9b. Record history for the user (in-memory; demo-friendly) ───────────
  if (options.userId) {
    recordHistory(options.userId, {
      id: sessionId,
      query,
      category,
      createdAt,
      bestMatchName: winner.canonicalName,
      bestMatchPrice: bestOfferPrice(winner),
      bestMatchScore: winnerScore.overall,
    });
  }

  // ── 10. Persist to DB (best-effort) ─────────────────────────────────────
  if (options.userId) {
    persistToDb(sessionId, options.userId, query, category, result).catch((err) => {
      logger.warn({ err, sessionId }, 'DB persistence failed (non-blocking)');
    });
  }

  return result;
}

/** Persist research session to DB asynchronously — never blocks the response. */
async function persistToDb(
  sessionId: string,
  userId: string,
  query: string,
  category: string,
  result: ResearchResult,
): Promise<void> {
  const prisma = await getPrisma();
  if (!prisma) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await prisma.researchSession.create({
      data: {
        id: sessionId,
        userId,
        query,
        category,
        resultJson: result as object,
      },
    });
  } catch (err) {
    logger.warn({ err, sessionId }, 'Failed to persist research session to DB');
  }
}

// ── What-If analysis ──────────────────────────────────────────────────────

export interface WhatIfOptions {
  budgetMax?: number;
  priorities?: Requirements['priorities'];
}

export async function applyWhatIf(
  sessionId: string,
  changes: WhatIfOptions,
): Promise<ResearchResult> {
  const cache = await getCache();
  const cached = await cache.get<CachedSession>(CacheKeys.research(sessionId));

  if (!cached) {
    throw Object.assign(new Error('Session not found or expired'), { statusCode: 404 });
  }

  const { products, requirements: originalReqs } = cached;

  // Merge what-if changes
  const updatedRequirements: Requirements = {
    ...originalReqs,
    budget: {
      ...originalReqs.budget,
      max: changes.budgetMax ?? originalReqs.budget.max,
    },
    priorities: changes.priorities ?? originalReqs.priorities,
  };

  const category = updatedRequirements.category;
  const weights = deriveWeights(category, updatedRequirements.priorities);
  const scores = scoreAll(products, category, weights, updatedRequirements.budget);

  const dims = CATEGORY_DIMENSIONS[category];
  const weightsList = dims.map((dim) => ({
    dimension: dim.key,
    label: dim.label,
    weight: weights[dim.key] ?? dim.defaultWeight,
  }));

  const withinBudget = scores.filter((s) => s.withinBudget);
  const winnerScore = withinBudget.length > 0 ? withinBudget[0]! : scores[0]!;

  if (!winnerScore) throw new Error('No products for what-if scenario');

  const winner = products.find((p) => p.id === winnerScore.productId)!;
  const alternatives = pickAlternatives(products, scores, category, winner.id);
  const dontBuy = deriveDontBuy(products, scores, category, updatedRequirements.budget, winner.id);

  // Use fallback prose for what-if (instant, no API call needed)
  const recommendation = fallbackBuildRecommendation(winner, winnerScore, updatedRequirements, products);

  const newSessionId = randomUUID();
  const result: ResearchResult = {
    sessionId: newSessionId,
    requirements: updatedRequirements,
    weights: weightsList,
    products,
    scores,
    recommendation,
    alternatives,
    dontBuy,
    sources: cached.result.sources,
    createdAt: new Date().toISOString(),
  };

  // Cache the new what-if result
  const newCached: CachedSession = { result, products, requirements: updatedRequirements };
  await cache.set(CacheKeys.research(newSessionId), newCached, CacheTTL.research);

  return result;
}

/** Get a cached research result by session ID. */
export async function getResearchSession(sessionId: string): Promise<ResearchResult | null> {
  const cache = await getCache();
  const cached = await cache.get<CachedSession>(CacheKeys.research(sessionId));
  return cached?.result ?? null;
}
