/**
 * Normalization / Entity Resolution service.
 *
 * Takes RawProduct[] + RawOffer[] from multiple adapters and produces
 * de-duplicated CanonicalProduct[] with:
 *  - Offers from all retailers merged under one canonical entity
 *  - Reviews from the most authoritative source (manufacturer > aggregate)
 *  - PriceIntelligence computed from historical price data
 *
 * Entity resolution:
 *  1. Primary key: `modelKey` (brand-model slug, stable across sources)
 *  2. Fuzzy fallback: token-overlap on `brand + model` strings
 *
 * NEVER fabricate price history. Surfaces "insufficient-data" when absent.
 */

import type {
  CanonicalProduct,
  PriceIntelligence,
  ProductOffer,
  ReviewSummary,
} from '@buywise/shared';
import type { RawOffer, RawProduct } from '../sources/ProductSource.js';

// ── Entity resolution ──────────────────────────────────────────────────────

/** Normalise a string for fuzzy matching. */
function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(normalise(a).split(/\s+/).filter(Boolean));
  const tokensB = new Set(normalise(b).split(/\s+/).filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let shared = 0;
  for (const t of tokensA) if (tokensB.has(t)) shared++;
  return shared / Math.max(tokensA.size, tokensB.size);
}

/** Resolve a RawProduct to an existing canonical group key (modelKey or generated). */
function resolveKey(
  raw: RawProduct,
  existing: Map<string, RawProduct[]>,
): string {
  // Primary: exact modelKey match
  if (existing.has(raw.modelKey)) return raw.modelKey;

  // Fuzzy fallback: brand + model token overlap
  const needle = `${raw.brand} ${raw.model}`;
  for (const [key, group] of existing.entries()) {
    const representative = group[0];
    if (!representative) continue;
    const haystack = `${representative.brand} ${representative.model}`;
    if (tokenOverlap(needle, haystack) >= 0.6) return key;
  }

  return raw.modelKey; // new entity
}

// ── Price intelligence ─────────────────────────────────────────────────────

function computePriceIntelligence(
  history: Array<{ date: string; price: number }> | null,
  currentPrice: number,
): PriceIntelligence {
  if (!history || history.length < 5) {
    return {
      current: currentPrice,
      currency: 'INR',
      avg30: null,
      low90: null,
      high90: null,
      trend: 'unknown',
      recommendation: 'insufficient-data',
      expectedRange: null,
      history: history ?? [],
      note: 'Insufficient historical data to make a price recommendation.',
    };
  }

  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const now = Date.now();

  // Last 30 days
  const last30 = sorted.filter(
    (p) => now - new Date(p.date).getTime() <= 30 * 24 * 60 * 60 * 1000,
  );
  // Last 90 days (all)
  const last90 = sorted;

  const avg = (pts: Array<{ price: number }>) =>
    pts.reduce((a, p) => a + p.price, 0) / pts.length;

  const avg30 = last30.length >= 3 ? Math.round(avg(last30)) : Math.round(avg(last90));
  const low90 = Math.min(...last90.map((p) => p.price));
  const high90 = Math.max(...last90.map((p) => p.price));

  // Trend: compare first-half median vs second-half median
  const half = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, half);
  const secondHalf = sorted.slice(half);
  const firstAvg = avg(firstHalf);
  const secondAvg = avg(secondHalf);
  const changePct = (secondAvg - firstAvg) / firstAvg;

  let trend: PriceIntelligence['trend'];
  if (changePct > 0.03) trend = 'rising';
  else if (changePct < -0.03) trend = 'falling';
  else trend = 'stable';

  // Buy recommendation
  let recommendation: PriceIntelligence['recommendation'];
  const nearLow = currentPrice <= low90 * 1.05;
  const wellAboveAvg = currentPrice > avg30 * 1.1;

  if (nearLow && trend !== 'rising') {
    recommendation = 'buy';
  } else if (wellAboveAvg && trend === 'rising') {
    recommendation = 'wait';
  } else {
    recommendation = 'neutral';
  }

  return {
    current: currentPrice,
    currency: 'INR',
    avg30,
    low90,
    high90,
    trend,
    recommendation,
    expectedRange: { low: low90, high: high90 },
    history: sorted,
  };
}

// ── Offer building ─────────────────────────────────────────────────────────

function buildOffer(raw: RawOffer, productId: string): ProductOffer {
  return {
    id: `${raw.sourceId}-${raw.retailerId}-${productId}`,
    productId,
    retailerId: raw.retailerId,
    retailerName: raw.retailerName,
    sourceId: raw.sourceId,
    price: raw.price,
    currency: 'INR',
    url: raw.url,
    inStock: raw.inStock,
    condition: raw.condition,
    fetchedAt: new Date().toISOString(),
  };
}

// ── Review merge ──────────────────────────────────────────────────────────

function mergeReviews(group: RawProduct[]): ReviewSummary | null {
  // Prefer manufacturer's review data (most aggregate), then any
  const withReviews = group.filter((p) => p.reviewSummary != null);
  if (withReviews.length === 0) return null;

  // Take the one with highest totalCount as base
  withReviews.sort((a, b) => (b.reviewSummary?.totalCount ?? 0) - (a.reviewSummary?.totalCount ?? 0));
  const base = withReviews[0]!.reviewSummary!;

  // Collect unique sources
  const sources = [...new Set(withReviews.flatMap((p) => p.reviewSummary?.sources ?? []))];

  return { ...base, sources };
}

// ── Main normalization function ────────────────────────────────────────────

/**
 * Merge raw products and offers from all sources into CanonicalProduct[].
 *
 * @param rawProducts  All raw products from all adapters.
 * @param rawOffers    All raw offers from all offer-source adapters.
 * @returns            De-duplicated canonical products with merged offers + price intelligence.
 */
export function normalizeProducts(
  rawProducts: RawProduct[],
  rawOffers: RawOffer[],
): CanonicalProduct[] {
  // ── 1. Group raw products by entity key ──────────────────────────────────
  const groups = new Map<string, RawProduct[]>();

  for (const raw of rawProducts) {
    const key = resolveKey(raw, groups);
    const existing = groups.get(key) ?? [];
    existing.push(raw);
    groups.set(key, existing);
  }

  // ── 2. Group offers by modelKey ──────────────────────────────────────────
  const offersByModelKey = new Map<string, RawOffer[]>();
  for (const offer of rawOffers) {
    const list = offersByModelKey.get(offer.modelKey) ?? [];
    list.push(offer);
    offersByModelKey.set(offer.modelKey, list);
  }

  // ── 3. Build canonical products ─────────────────────────────────────────
  const results: CanonicalProduct[] = [];

  for (const [modelKey, group] of groups.entries()) {
    if (group.length === 0) continue;

    // Use manufacturer source as base if present, else first occurrence
    const base =
      group.find((p) => p.sourceId === 'manufacturer') ?? group[0]!;

    // Stable product ID derived from modelKey
    const productId = modelKey;

    // Merge offers (exclude manufacturer MSRP offers — they have inStock:false)
    const rawOffersForProduct = offersByModelKey.get(modelKey) ?? [];
    const purchasableOffers = rawOffersForProduct.filter(
      (o) => o.sourceId !== 'manufacturer' || rawOffersForProduct.length === 1,
    );

    const offers = purchasableOffers.map((o) => buildOffer(o, productId));

    // Current price = min in-stock offer, fallback to any offer
    const inStockPrices = offers.filter((o) => o.inStock).map((o) => o.price);
    const allPrices = offers.map((o) => o.price);
    const currentPrice =
      inStockPrices.length > 0
        ? Math.min(...inStockPrices)
        : allPrices.length > 0
          ? Math.min(...allPrices)
          : base.basePrice;

    const priceIntelligence = computePriceIntelligence(base.priceHistory, currentPrice);

    const reviews = mergeReviews(group);

    const sources = [...new Set(group.map((p) => p.sourceId))];

    const canonical: CanonicalProduct = {
      id: productId,
      canonicalName: base.canonicalName,
      brand: base.brand,
      category: base.category as CanonicalProduct['category'],
      model: base.model,
      imageUrl: base.imageUrl,
      releaseYear: base.releaseYear,
      specs: base.specs,
      attributes: base.attributes,
      features: base.features,
      offers,
      reviews,
      price: offers.length > 0 ? priceIntelligence : null,
      sources,
    };

    results.push(canonical);
  }

  return results;
}

/**
 * Generate a stable UUID from a modelKey.
 * Used when a proper uuid() is needed but we want determinism for tests.
 * (For production DB storage we rely on DB-generated UUIDs.)
 */
export function stableId(modelKey: string): string {
  // Simple deterministic hash — not cryptographic, just for demo stability
  const hash = modelKey.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  const hex = hash.toString(16).padStart(8, '0');
  return `${hex.slice(0, 8)}-0000-4000-8000-${hex.repeat(3).slice(0, 12)}`;
}

// Export for testing
export { computePriceIntelligence };
