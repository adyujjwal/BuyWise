import {
  deriveWeights,
  scoreAll,
  pickAlternatives,
  deriveDontBuy,
  bestOfferPrice,
  CATEGORY_DIMENSIONS,
  type ResearchResult,
  type CanonicalProduct,
  type ProductScore,
  type Priority,
  type Alternatives,
  type DontBuy,
  type Budget,
} from '@buywise/shared';
import { formatPrice } from './format';

export interface WhatIfComputed {
  scores: ProductScore[];
  weights: Array<{ dimension: string; label: string; weight: number }>;
  winnerId: string;
  alternatives: Alternatives;
  dontBuy: DontBuy[];
  reasons: string[];
  tradeoffs: string[];
  movement: { from: number; to: number } | null;
}

/** Map a scoring dimension to the human spec that justifies it (for grounded prose). */
const DIM_SPEC_HINT: Record<string, string[]> = {
  performance: ['cpu', 'ram'],
  battery: ['battery'],
  portability: ['weight'],
  display: ['display'],
  gaming: ['gpu'],
  camera: ['camera', 'rearCamera'],
  picture: ['panel', 'display'],
  imageQuality: ['sensor'],
  noiseCancelling: ['anc'],
  sound: ['drivers'],
};

function groundedReason(product: CanonicalProduct, dim: string, label: string): string {
  const hints = DIM_SPEC_HINT[dim] ?? [];
  const specVal = hints.map((h) => product.specs[h]).find((v) => v !== undefined);
  const detail = specVal ? ` (${specVal})` : '';
  switch (dim) {
    case 'performance':
      return `Handles demanding workloads comfortably${detail}.`;
    case 'value':
      return `Strong value — it does more for the money than its rivals here.`;
    case 'battery':
      return `Battery holds up through a full day away from a charger${detail}.`;
    case 'portability':
      return `Easy to travel with${detail}.`;
    case 'display':
      return `A display that’s a clear step above the field${detail}.`;
    case 'gaming':
      return `Capable for gaming${detail}.`;
    case 'camera':
      return `Camera system that stands out in this budget${detail}.`;
    case 'reviews':
      return `Owners rate it well, with few recurring complaints.`;
    default:
      return `${label} is a genuine strength here${detail}.`;
  }
}

/**
 * Recompute a recommendation entirely client-side using the SHARED scoring
 * engine — identical math to the server. Powers instant "what-if" without a
 * round-trip. Prose is templated from real attributes/specs, never invented.
 */
export function recomputeWhatIf(
  result: ResearchResult,
  change: { budgetMax?: number; priorities?: Priority[] },
): WhatIfComputed {
  const category = result.requirements.category;
  const priorities = change.priorities ?? result.requirements.priorities;
  const budget: Budget = {
    ...result.requirements.budget,
    max: change.budgetMax ?? result.requirements.budget.max,
  };

  const weights = deriveWeights(category, priorities);
  const scores = scoreAll(result.products, category, weights, budget);

  // Winner = top score that fits budget; fall back to top overall.
  const inBudget = scores.filter((s) => s.withinBudget);
  const winner = (inBudget[0] ?? scores[0])!;
  const winnerId = winner.productId;

  const alternatives = pickAlternatives(result.products, scores, category, winnerId);
  const dontBuy = deriveDontBuy(result.products, scores, category, budget, winnerId);

  const byId = new Map(result.products.map((p) => [p.id, p]));
  const product = byId.get(winnerId)!;
  const breakdown = [...winner.breakdown].sort((a, b) => b.contribution - a.contribution);

  const reasons: string[] = [];
  for (const b of breakdown) {
    if (reasons.length >= 3) break;
    if (b.score >= 74) reasons.push(groundedReason(product, b.dimension, b.label));
  }
  // Price-based reason.
  const price = bestOfferPrice(product);
  if (price !== null) {
    if (budget.max !== null && price <= budget.max) {
      const under = budget.max - price;
      if (under > 1000) reasons.push(`Comes in ${formatPrice(under, budget.currency)} under your budget.`);
    }
    if (product.price?.low90 && price <= product.price.low90 * 1.03) {
      reasons.push(`Currently near its 90-day low of ${formatPrice(product.price.low90, budget.currency)}.`);
    }
  }

  const tradeoffs: string[] = [];
  for (const b of breakdown) {
    if (tradeoffs.length >= 2) break;
    if (b.score < 64 && b.weight > 0.08) {
      tradeoffs.push(
        `${b.label} is the weakest part of this pick — fine for most, worth noting if it’s a priority for you.`,
      );
    }
  }
  if (product.reviews?.cons.length) {
    tradeoffs.push(`Reviewers mention: ${product.reviews.cons[0]}.`);
  }

  // Movement of the winner relative to the original ranking.
  const prevRank = result.scores.findIndex((s) => s.productId === winnerId);
  const newRank = scores.findIndex((s) => s.productId === winnerId);
  const movement = prevRank >= 0 && prevRank !== newRank ? { from: prevRank + 1, to: newRank + 1 } : null;

  const weightList = CATEGORY_DIMENSIONS[category].map((d) => ({
    dimension: d.key,
    label: d.label,
    weight: weights[d.key] ?? d.defaultWeight,
  }));

  return { scores, weights: weightList, winnerId, alternatives, dontBuy, reasons, tradeoffs: tradeoffs.slice(0, 3), movement };
}
