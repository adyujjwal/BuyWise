/**
 * Fully deterministic fallback agent.
 *
 * Used when:
 *  - OPENAI_API_KEY is not set (demo / no-key mode)
 *  - OpenAI API errors after retries
 *
 * Produces a COMPLETE, sensible ResearchResult with no LLM calls.
 * All text is grounded in actual product data (attributes, specs, reviews).
 * NEVER invents data.
 */

import {
  CATEGORY_DIMENSIONS,
  type CanonicalProduct,
  type ProductScore,
  type Recommendation,
  type Requirements,
} from '@buywise/shared';
import { bestOfferPrice } from '@buywise/shared';
import { logger } from '../lib/logger.js';

// ── Requirement extraction heuristics ─────────────────────────────────────

/** Parse budget from natural-language phrases. Returns INR value or null. */
function parseBudget(query: string): { min: number | null; max: number | null } {
  const q = query.toLowerCase();

  // Patterns: ₹1.2L, ₹1.2 lakh, 1.2 lakh, 80k, 80000, under/below/around/upto X
  const lakhPattern = /(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:l|lakh|lakhs)/i;
  const kPattern = /(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*k\b/i;
  const numPattern = /(?:₹|rs\.?\s*)(\d{4,7})/i;

  function parseAmount(s: string): number | null {
    const lm = lakhPattern.exec(s);
    if (lm?.[1]) return Math.round(parseFloat(lm[1]) * 100000);
    const km = kPattern.exec(s);
    if (km?.[1]) return Math.round(parseFloat(km[1]) * 1000);
    const nm = numPattern.exec(s);
    if (nm?.[1]) return parseInt(nm[1], 10);
    return null;
  }

  // under / below / upto / within → max
  const underMatch = /(?:under|below|upto|up to|within|less than|max|maximum)\s+([\w₹\s.]+)/i.exec(q);
  if (underMatch?.[1]) {
    const max = parseAmount(underMatch[1]);
    if (max) return { min: null, max };
  }

  // around / approximately → max ×1.1
  const aroundMatch = /(?:around|approximately|about|~)\s+([\w₹\s.]+)/i.exec(q);
  if (aroundMatch?.[1]) {
    const approx = parseAmount(aroundMatch[1]);
    if (approx) return { min: Math.round(approx * 0.85), max: Math.round(approx * 1.1) };
  }

  // Any standalone number
  const amount = parseAmount(q);
  if (amount) return { min: null, max: amount };

  return { min: null, max: null };
}

/** Extract priorities from cue keywords. */
function extractPriorities(
  query: string,
  category: Requirements['category'],
): Requirements['priorities'] {
  const q = query.toLowerCase();
  const dims = CATEGORY_DIMENSIONS[category];
  const priorities: Requirements['priorities'] = [];

  for (const dim of dims) {
    let importance = 0.5; // neutral
    const matched = dim.cues.some((cue) => q.includes(cue));
    if (matched) {
      // Boost importance based on explicit emphasis words
      const strong = ['very', 'really', 'extremely', 'critical', 'must', 'priority'].some((w) =>
        q.includes(w),
      );
      importance = strong ? 0.85 : 0.75;
    }
    priorities.push({ dimension: dim.key, importance });
  }

  return priorities;
}

/** Extract must-have constraints from common patterns. */
function extractMustHave(query: string): string[] {
  const q = query.toLowerCase();
  const constraints: string[] = [];

  // RAM: 16gb, 32gb
  const ramMatch = /(\d+)\s*gb\s+(?:ram|memory)/i.exec(q) ?? /(\d+)\s*gb/i.exec(q);
  if (ramMatch?.[1]) constraints.push(`${ramMatch[1]}GB RAM`);

  // Storage: 512gb ssd, 1tb
  const storageMatch = /(\d+)\s*(gb|tb)\s*(?:ssd|nvme|storage)/i.exec(q);
  if (storageMatch?.[1] && storageMatch?.[2]) {
    constraints.push(`${storageMatch[1]}${storageMatch[2].toUpperCase()} SSD`);
  }

  // GPU keywords
  if (/rtx\s*\d+/i.test(q)) {
    const gpuMatch = /rtx\s*(\d+)/i.exec(q);
    if (gpuMatch?.[1]) constraints.push(`RTX ${gpuMatch[1]} GPU`);
  }
  if (/dedicated\s+(?:gpu|graphics)/i.test(q)) constraints.push('Dedicated GPU');

  return constraints;
}

/**
 * Deterministically extract Requirements from a raw query.
 * No API calls — regex + keyword heuristics only.
 */
export function fallbackExtractRequirements(
  query: string,
  category: Requirements['category'],
): Requirements {
  const budget = parseBudget(query);
  const priorities = extractPriorities(query, category);
  const mustHave = extractMustHave(query);
  const q = query.toLowerCase();

  const useCases: string[] = [];
  if (q.includes('gaming') || q.includes('game')) useCases.push('gaming');
  if (q.includes('docker') || q.includes('kubernetes') || q.includes('dev') || q.includes('coding')) useCases.push('development');
  if (q.includes('travel') || q.includes('portable') || q.includes('commute')) useCases.push('travel');
  if (q.includes('photo') || q.includes('video') || q.includes('vlog')) useCases.push('content creation');
  if (q.includes('office') || q.includes('work') || q.includes('zoom')) useCases.push('office productivity');

  const summary = buildSummary(query, category, budget, useCases);

  logger.info({ event: 'fallback_extract', category, budget, useCasesCount: useCases.length });

  return {
    category,
    rawQuery: query,
    summary,
    budget: { min: budget.min, max: budget.max, currency: 'INR' },
    useCases,
    priorities,
    mustHave,
    niceToHave: [],
    confidence: 0.65,
  };
}

function buildSummary(
  query: string,
  category: string,
  budget: { min: number | null; max: number | null },
  useCases: string[],
): string {
  const parts: string[] = [`Looking for a ${category}`];
  if (budget.max) parts.push(`under ₹${(budget.max / 1000).toFixed(0)}k`);
  if (useCases.length > 0) parts.push(`for ${useCases.slice(0, 2).join(' and ')}`);
  if (query.length < 80) parts.push(`(${query.trim()})`);
  return parts.join(' ') + '.';
}

// ── Recommendation prose generation ──────────────────────────────────────

/**
 * Generate honest, grounded recommendation text from product data.
 * No LLM — text is templated but based on real attributes/specs/reviews.
 */
export function fallbackBuildRecommendation(
  winner: CanonicalProduct,
  score: ProductScore,
  requirements: Requirements,
  _allProducts: CanonicalProduct[],
): Recommendation {
  const dims = CATEGORY_DIMENSIONS[requirements.category];
  const price = bestOfferPrice(winner) ?? winner.price?.current;
  const priceRec = winner.price?.recommendation;

  // Top 3 contributing dimensions
  const topDims = [...score.breakdown]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3);

  // Reasons: grounded in top dimensions and specs
  const reasons: string[] = [];

  for (const dim of topDims) {
    const dimDef = dims.find((d) => d.key === dim.dimension);
    if (!dimDef) continue;

    const attrVal = winner.attributes[dim.dimension] ?? 50;
    const specValue = winner.specs[dim.dimension];

    if (dim.dimension === 'performance') {
      const cpu = winner.specs['cpu'] ?? winner.specs['chipset'] ?? '';
      const gpu = winner.specs['gpu'] ?? '';
      const cpuStr = String(cpu);
      const gpuStr = String(gpu);
      reasons.push(
        `Strong ${dimDef.label.toLowerCase()} (${attrVal}/100)${cpuStr ? ` — ${cpuStr}` : ''}${gpuStr ? ` with ${gpuStr}` : ''}.`,
      );
    } else if (dim.dimension === 'battery') {
      const bat = winner.specs['battery'] ?? winner.specs['batteryLife'] ?? '';
      reasons.push(
        `${dimDef.label} score ${attrVal}/100${String(bat) ? ` — ${String(bat)}` : ''}.`,
      );
    } else if (dim.dimension === 'value') {
      reasons.push(
        `Best-in-class ${dimDef.label.toLowerCase()} at its price point (${attrVal}/100 value score).`,
      );
    } else if (dim.dimension === 'portability') {
      const weight = winner.specs['weight'] ?? '';
      reasons.push(
        `${dimDef.label} score ${attrVal}/100${String(weight) ? ` — weighs ${String(weight)}` : ''}.`,
      );
    } else {
      reasons.push(
        `${dimDef.label} score ${attrVal}/100${specValue !== undefined ? ` — ${String(specValue)}` : ''}.`,
      );
    }
  }

  // Add review reason if reviews are good
  if (winner.reviews && winner.reviews.averageRating >= 4.3) {
    reasons.push(
      `Rated ${winner.reviews.averageRating.toFixed(1)}/5 by ${winner.reviews.totalCount.toLocaleString()} owners — ${winner.reviews.pros[0] ?? 'well reviewed'}.`,
    );
  }

  // Price buy signal
  if (priceRec === 'buy' && price) {
    reasons.push(
      `Current price ₹${price.toLocaleString()} is near its 90-day low — a good time to buy.`,
    );
  }

  // Tradeoffs: grounded in cons and low-scoring dims
  const tradeoffs: string[] = [];

  // Lowest scoring dims
  const worstDim = [...score.breakdown]
    .sort((a, b) => a.score - b.score)
    .find((d) => d.score < 50);
  if (worstDim) {
    const dimDef = dims.find((d) => d.key === worstDim.dimension);
    const label = dimDef?.label ?? worstDim.dimension;
    tradeoffs.push(`${label} is a weaker point (${worstDim.score}/100) — worth knowing before you buy.`);
  }

  // Review cons
  const con1 = winner.reviews?.cons[0];
  const con2 = winner.reviews?.cons[1];
  if (con1) tradeoffs.push(con1);
  if (con2 && tradeoffs.length < 3) tradeoffs.push(con2);

  if (tradeoffs.length === 0) {
    tradeoffs.push('No major tradeoffs for your stated use case.');
  }

  // Evidence items
  const evidence: Recommendation['evidence'] = [];

  if (price) {
    evidence.push({
      label: 'Current price',
      value: `₹${price.toLocaleString()}`,
      kind: 'price',
    });
  }
  if (winner.price?.avg30) {
    evidence.push({
      label: '30-day avg',
      value: `₹${winner.price.avg30.toLocaleString()}`,
      kind: 'price',
    });
  }
  if (winner.reviews) {
    evidence.push({
      label: 'Owner rating',
      value: `${winner.reviews.averageRating.toFixed(1)}/5 (${winner.reviews.totalCount.toLocaleString()} reviews)`,
      kind: 'review',
    });
  }

  const cpuSpec = winner.specs['cpu'] ?? winner.specs['chipset'];
  if (cpuSpec) evidence.push({ label: 'Processor', value: String(cpuSpec), kind: 'spec' });

  const gpuSpec = winner.specs['gpu'];
  if (gpuSpec) evidence.push({ label: 'Graphics', value: String(gpuSpec), kind: 'spec' });

  const ramSpec = winner.specs['ram'] ?? winner.specs['memory'];
  if (ramSpec) evidence.push({ label: 'RAM', value: String(ramSpec), kind: 'spec' });

  evidence.push({
    label: 'Overall score',
    value: `${score.overall}/100`,
    kind: 'source',
  });

  return {
    productId: winner.id,
    score,
    reasons: reasons.slice(0, 5),
    tradeoffs: tradeoffs.slice(0, 3),
    evidence,
  };
}
