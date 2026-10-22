/**
 * AI agent orchestrator.
 *
 * Uses OpenAI function-calling to:
 *  1. Extract Requirements from the raw user query.
 *  2. Generate recommendation prose (reasons, tradeoffs, evidence) grounded
 *     in the deterministically-computed product scores.
 *
 * The LLM NEVER computes scores, prices, or reviews — those come from
 * the deterministic services. The LLM only extracts intent and writes prose.
 *
 * Falls back to the deterministic fallback path on any error.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import {
  RequirementsSchema,
  type CanonicalProduct,
  type ProductScore,
  type Requirements,
  type Recommendation,
} from '@buywise/shared';
import { env, hasOpenAI } from '../config/env.js';
import { logEvent, logger } from '../lib/logger.js';

// ── OpenAI client (lazy singleton) ────────────────────────────────────────

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return _openai;
}

// ── Requirement extraction ─────────────────────────────────────────────────

const EXTRACT_SYSTEM = `You are a product research assistant. Extract structured purchase requirements from the user's query.
Respond with a single JSON object (no prose) containing: summary, budget {min,max}, useCases[], priorities[{dimension,importance}], mustHave[], niceToHave[], confidence.
Be conservative with priorities — only set high importance (>0.7) when explicitly stated.
Budget: parse ₹, Rs, lakh (1 lakh = 100000), k (1k = 1000). "under X" → max=X, min=null.
Dimension keys for laptops: performance, value, battery, portability, display, gaming, reviews.
Dimension keys for phones: performance, camera, battery, value, display, reviews.
Dimension keys for tvs: picture, gaming, value, sound, smart, reviews.
Dimension keys for cameras: imageQuality, portability, video, value, autofocus, reviews.
Dimension keys for headphones: noiseCancelling, sound, comfort, battery, value, reviews.`;

export async function extractRequirements(
  query: string,
  categoryHint: string,
): Promise<Requirements> {
  if (!hasOpenAI) throw new Error('OpenAI not configured');

  const openai = getOpenAI();
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: EXTRACT_SYSTEM },
    {
      role: 'user',
      content: `Category hint: ${categoryHint}\n\nQuery: ${query}`,
    },
  ];

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      logEvent('tool_called', { tool: 'extractRequirements', attempt });

      const response = await openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from OpenAI');

      const parsed = JSON.parse(content) as Record<string, unknown>;

      // The model returns intent fields; we own the authoritative identity
      // fields (category is already deterministically detected, rawQuery is the
      // input). Normalize so required schema fields are always present.
      const budget = (parsed.budget ?? {}) as { min?: number | null; max?: number | null };
      const candidate = {
        category: categoryHint,
        rawQuery: query,
        summary: typeof parsed.summary === 'string' ? parsed.summary : `Looking for a ${categoryHint}.`,
        budget: { min: budget.min ?? null, max: budget.max ?? null, currency: 'INR' as const },
        useCases: Array.isArray(parsed.useCases) ? parsed.useCases : [],
        priorities: Array.isArray(parsed.priorities) ? parsed.priorities : [],
        mustHave: Array.isArray(parsed.mustHave) ? parsed.mustHave : [],
        niceToHave: Array.isArray(parsed.niceToHave) ? parsed.niceToHave : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      };
      const validated = RequirementsSchema.parse(candidate);
      return validated;
    } catch (err) {
      lastError = err;
      logEvent('tool_failed', { tool: 'extractRequirements', attempt, err: String(err) });
    }
  }
  throw lastError;
}

// ── Recommendation prose generation ──────────────────────────────────────

const RecommendationProseSchema = z.object({
  reasons: z.array(z.string()).min(2).max(6),
  tradeoffs: z.array(z.string()).min(1).max(4),
  evidence: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      kind: z.enum(['spec', 'price', 'review', 'source', 'tradeoff']),
    }),
  ),
});

type RecommendationProse = z.infer<typeof RecommendationProseSchema>;

const PROSE_SYSTEM = `You are a product recommendation writer. You receive structured product data (scores, specs, reviews, price)
and write clear, evidence-grounded recommendation text. Be specific — cite actual specs and prices.
Never invent data. If a value is null/missing, say so or omit it. Respond with JSON only.`;

export async function generateRecommendationProse(
  winner: CanonicalProduct,
  score: ProductScore,
  requirements: Requirements,
  allProducts: CanonicalProduct[],
): Promise<RecommendationProse> {
  if (!hasOpenAI) throw new Error('OpenAI not configured');

  const openai = getOpenAI();

  // Build a compact context object — only what the LLM needs
  const context = {
    winner: {
      name: winner.canonicalName,
      price: winner.price?.current ?? 'unknown',
      priceRec: winner.price?.recommendation ?? 'unknown',
      specs: winner.specs,
      attributes: winner.attributes,
      overallScore: score.overall,
      topBreakdown: score.breakdown
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 4)
        .map((b) => ({ dim: b.label, score: b.score, weight: b.weight })),
      reviewRating: winner.reviews?.averageRating ?? null,
      pros: winner.reviews?.pros ?? [],
      cons: winner.reviews?.cons ?? [],
    },
    requirements: {
      summary: requirements.summary,
      budgetMax: requirements.budget.max,
      useCases: requirements.useCases,
      mustHave: requirements.mustHave,
    },
    competitorCount: allProducts.length - 1,
  };

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: PROSE_SYSTEM },
    {
      role: 'user',
      content: `Generate recommendation prose for the winning product.\n\nContext:\n${JSON.stringify(context, null, 2)}\n\nRespond with JSON: { "reasons": [...], "tradeoffs": [...], "evidence": [{ "label": ..., "value": ..., "kind": "spec"|"price"|"review"|"source"|"tradeoff" }] }`,
    },
  ];

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      logEvent('tool_called', { tool: 'generateRecommendationProse', attempt });

      const response = await openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 1200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from OpenAI');

      const parsed = JSON.parse(content) as Record<string, unknown>;

      // Normalize LLM variance before validation: it sometimes returns numeric
      // evidence values, extra reasons/tradeoffs, or an unexpected `kind`.
      const KINDS = ['spec', 'price', 'review', 'source', 'tradeoff'] as const;
      const toStr = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));
      const rawEvidence = Array.isArray(parsed.evidence) ? parsed.evidence : [];
      const candidate = {
        reasons: (Array.isArray(parsed.reasons) ? parsed.reasons : []).map(toStr).slice(0, 6),
        tradeoffs: (Array.isArray(parsed.tradeoffs) ? parsed.tradeoffs : []).map(toStr).slice(0, 4),
        evidence: rawEvidence.map((e) => {
          const item = (e ?? {}) as Record<string, unknown>;
          return {
            label: toStr(item.label),
            value: toStr(item.value),
            kind: KINDS.includes(item.kind as (typeof KINDS)[number]) ? item.kind : 'spec',
          };
        }),
      };
      const validated = RecommendationProseSchema.parse(candidate);

      logEvent('recommendation_generated', {
        productId: winner.id,
        score: score.overall,
        reasons: validated.reasons.length,
      });

      return validated;
    } catch (err) {
      lastError = err;
      logEvent('tool_failed', { tool: 'generateRecommendationProse', attempt, err: String(err) });
    }
  }
  throw lastError;
}

/**
 * Build a full Recommendation object using AI-generated prose.
 * If the AI call fails, throws — caller should fall back.
 */
export async function buildRecommendation(
  winner: CanonicalProduct,
  score: ProductScore,
  requirements: Requirements,
  allProducts: CanonicalProduct[],
): Promise<Recommendation> {
  const prose = await generateRecommendationProse(winner, score, requirements, allProducts);

  return {
    productId: winner.id,
    score,
    reasons: prose.reasons,
    tradeoffs: prose.tradeoffs,
    evidence: prose.evidence,
  };
}

export { hasOpenAI };

// Log on import if OpenAI is not configured
if (!hasOpenAI) {
  logger.info('AI agent: OpenAI not configured — will use deterministic fallback');
}
