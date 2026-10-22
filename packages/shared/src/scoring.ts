import { CATEGORY_DIMENSIONS } from './categories.js';
import type {
  Alternatives,
  Budget,
  CanonicalProduct,
  Category,
  DontBuy,
  Priority,
  ProductScore,
  ScoreBreakdown,
} from './schemas.js';

/**
 * The deterministic scoring engine.
 *
 * This is intentionally NOT the LLM's job. The agent extracts requirements and
 * writes prose; these pure functions decide the numbers. The same module runs
 * on the server (authoritative result) and in the browser (instant "what-if"
 * recalculation) so the two can never disagree.
 */

const NEUTRAL_IMPORTANCE = 0.5;

/** Lowest in-stock offer price, or lowest offer price, or null. */
export function bestOfferPrice(product: CanonicalProduct): number | null {
  const offers = product.offers.filter((o) => o.inStock);
  const pool = offers.length ? offers : product.offers;
  if (!pool.length) return null;
  return Math.min(...pool.map((o) => o.price));
}

/**
 * Turn user priorities into concrete, normalized weights.
 * Starts from each category's neutral defaults and tilts them by stated
 * importance, with a gentle tension model (boosting battery slightly damps
 * the dimensions that trade against it, e.g. raw performance).
 */
export function deriveWeights(category: Category, priorities: Priority[]): Record<string, number> {
  const dims = CATEGORY_DIMENSIONS[category];
  const importanceByKey = new Map(priorities.map((p) => [p.dimension, p.importance]));
  const raw: Record<string, number> = {};

  for (const dim of dims) {
    const importance = importanceByKey.get(dim.key) ?? NEUTRAL_IMPORTANCE;
    // Map importance [0,1] → multiplier [0.4, 2.2], neutral at 0.5 → 1.0.
    const multiplier = importance <= NEUTRAL_IMPORTANCE
      ? 0.4 + (importance / NEUTRAL_IMPORTANCE) * 0.6
      : 1 + ((importance - NEUTRAL_IMPORTANCE) / NEUTRAL_IMPORTANCE) * 1.2;
    raw[dim.key] = dim.defaultWeight * multiplier;
  }

  // Tension: a strongly prioritized dimension dampens its opposites.
  for (const dim of dims) {
    const importance = importanceByKey.get(dim.key) ?? NEUTRAL_IMPORTANCE;
    if (importance > 0.65 && dim.tension) {
      for (const opposed of dim.tension) {
        if (raw[opposed] !== undefined) raw[opposed] *= 1 - (importance - 0.65) * 0.6;
      }
    }
  }

  const total = Object.values(raw).reduce((a, b) => a + b, 0) || 1;
  const normalized: Record<string, number> = {};
  for (const key of Object.keys(raw)) normalized[key] = raw[key]! / total;
  return normalized;
}

/** Fraction [0,1] to subtract from the score when a product exceeds budget. */
function budgetPenalty(price: number | null, budget: Budget): number {
  if (price === null || budget.max === null) return 0;
  if (price <= budget.max) return 0;
  const overage = (price - budget.max) / budget.max;
  // 10% over → 0.15 penalty; 25%+ over → effectively ruled out.
  return Math.min(1, overage * 1.5);
}

export function scoreProduct(
  product: CanonicalProduct,
  category: Category,
  weights: Record<string, number>,
  budget: Budget,
): ProductScore {
  const dims = CATEGORY_DIMENSIONS[category];
  const breakdown: ScoreBreakdown[] = dims.map((dim) => {
    const attr = clamp(product.attributes[dim.key] ?? 50, 0, 100);
    const weight = weights[dim.key] ?? dim.defaultWeight;
    return {
      dimension: dim.key,
      label: dim.label,
      score: Math.round(attr),
      weight: round3(weight),
      contribution: round1(attr * weight),
    };
  });

  const base = breakdown.reduce((acc, b) => acc + b.score * b.weight, 0);
  const price = bestOfferPrice(product);
  const penalty = budgetPenalty(price, budget);
  const overall = clamp(base * (1 - penalty), 0, 100);

  return {
    productId: product.id,
    overall: Math.round(overall),
    breakdown,
    withinBudget: price === null || budget.max === null ? true : price <= budget.max,
    budgetPenaltyApplied: round3(penalty),
  };
}

export function scoreAll(
  products: CanonicalProduct[],
  category: Category,
  weights: Record<string, number>,
  budget: Budget,
): ProductScore[] {
  return products
    .map((p) => scoreProduct(p, category, weights, budget))
    .sort((a, b) => b.overall - a.overall);
}

/** Pick labelled alternatives distinct from the winner where meaningful. */
export function pickAlternatives(
  products: CanonicalProduct[],
  scores: ProductScore[],
  category: Category,
  winnerId: string,
): Alternatives {
  const byId = new Map(products.map((p) => [p.id, p]));
  const others = scores.filter((s) => s.productId !== winnerId);
  const dims = CATEGORY_DIMENSIONS[category];
  const hasBattery = dims.some((d) => d.key === 'battery');

  const topBy = (fn: (p: CanonicalProduct, s: ProductScore) => number): string | null => {
    let best: { id: string; v: number } | null = null;
    for (const s of others) {
      const p = byId.get(s.productId);
      if (!p) continue;
      const v = fn(p, s);
      if (best === null || v > best.v) best = { id: s.productId, v };
    }
    return best?.id ?? null;
  };

  const valueScore = (p: CanonicalProduct, s: ProductScore) => {
    const price = bestOfferPrice(p) ?? Number.MAX_SAFE_INTEGER;
    return s.overall / (price / 1000);
  };

  return {
    bestValue: topBy((p) => p.attributes.value ?? 0) ?? topBy(valueScore),
    bestPerformance: topBy((p) => p.attributes.performance ?? p.attributes.imageQuality ?? p.attributes.picture ?? 0),
    bestBattery: hasBattery ? topBy((p) => p.attributes.battery ?? 0) : null,
    cheapest: topBy((p) => -(bestOfferPrice(p) ?? Number.MAX_SAFE_INTEGER)),
  };
}

/**
 * Deterministic "don't buy" candidates. The agent may phrase the explanation,
 * but the *decision* that something is a poor choice is grounded in these rules.
 */
export function deriveDontBuy(
  products: CanonicalProduct[],
  scores: ProductScore[],
  category: Category,
  budget: Budget,
  winnerId: string,
): DontBuy[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const scoreById = new Map(scores.map((s) => [s.productId, s]));
  const winnerScore = scoreById.get(winnerId)?.overall ?? 0;
  const out: DontBuy[] = [];

  for (const product of products) {
    if (product.id === winnerId) continue;
    const s = scoreById.get(product.id);
    if (!s) continue;
    const price = bestOfferPrice(product);

    if (price !== null && budget.max !== null && price > budget.max * 1.08) {
      out.push({
        productId: product.id,
        reason: 'overpriced-now',
        explanation: `At its current price it sits above your budget, and nothing about it justifies the premium over the top pick.`,
      });
      continue;
    }
    if (category === 'laptop' && (product.attributes.battery ?? 100) < 45 && s.overall < winnerScore - 8) {
      out.push({
        productId: product.id,
        reason: 'weak-battery',
        explanation: `Battery life is a weak point here — you'd be tethered to a charger on travel days, which is exactly what you wanted to avoid.`,
      });
      continue;
    }
    if (product.reviews && product.reviews.averageRating < 3.9 && product.reviews.sentiment.negative > 0.3) {
      out.push({
        productId: product.id,
        reason: 'review-concerns',
        explanation: `Owner reviews raise recurring concerns (${product.reviews.cons.slice(0, 2).join(', ')}) that outweigh its on-paper specs.`,
      });
      continue;
    }
    if (s.overall < winnerScore - 12 && (product.attributes.value ?? 50) < 55) {
      out.push({
        productId: product.id,
        reason: 'poor-value',
        explanation: `You pay close to the same money for a noticeably weaker fit against your priorities — the value just isn't there.`,
      });
      continue;
    }
  }
  return out.slice(0, 4);
}

// ── helpers ───────────────────────────────────────────────────
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
