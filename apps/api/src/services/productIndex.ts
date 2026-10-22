/**
 * Product index — resolves canonical products (with merged offers + price
 * intelligence) by id, outside of a research session.
 *
 * Used by product detail, compare, saved and watchlist routes so they show the
 * same prices/offers a research result would. Built once by querying every
 * source across every category and normalizing, then cached in memory.
 *
 * TODO(real-integration): back this with the database / a search index once
 * real sources are connected, instead of an in-memory build.
 */

import { CATEGORIES, type CanonicalProduct, type Category, type Requirements } from '@buywise/shared';
import { getSources } from '../sources/index.js';
import { normalizeProducts } from './normalization.js';
import type { RawOffer, RawProduct } from '../sources/ProductSource.js';

let indexCache: Map<string, CanonicalProduct> | null = null;

function wideRequirements(category: Category): Requirements {
  return {
    category,
    rawQuery: '',
    summary: '',
    budget: { min: null, max: null, currency: 'INR' },
    useCases: [],
    priorities: [],
    mustHave: [],
    niceToHave: [],
    confidence: 1,
  };
}

/** Build (once) and return the full id → CanonicalProduct index. */
export async function getProductIndex(): Promise<Map<string, CanonicalProduct>> {
  if (indexCache) return indexCache;

  const sources = getSources();
  const rawProducts: RawProduct[] = [];
  const rawOffers: RawOffer[] = [];

  for (const category of CATEGORIES) {
    await Promise.all(
      sources.map(async (source) => {
        const products = await source.searchProducts(wideRequirements(category)).catch(() => []);
        rawProducts.push(...products);
        if (source.isOfferSource) {
          const nested = await Promise.all(products.map((p) => source.getOffers(p.externalId).catch(() => [])));
          for (const offers of nested) rawOffers.push(...offers);
        }
      }),
    );
  }

  const canonical = normalizeProducts(rawProducts, rawOffers);
  indexCache = new Map(canonical.map((p) => [p.id, p]));
  return indexCache;
}

/** Resolve a list of product ids to canonical products (missing ids dropped). */
export async function resolveProducts(ids: string[]): Promise<CanonicalProduct[]> {
  const index = await getProductIndex();
  return ids.map((id) => index.get(id)).filter((p): p is CanonicalProduct => Boolean(p));
}

/** Resolve a single product id, or null. */
export async function resolveProduct(id: string): Promise<CanonicalProduct | null> {
  const index = await getProductIndex();
  return index.get(id) ?? null;
}
