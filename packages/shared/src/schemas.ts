import { z } from 'zod';

/**
 * BuyWise domain contracts.
 *
 * Zod schemas are the single source of truth; TypeScript types are inferred
 * from them so the API, the agent's structured outputs, and the web client all
 * speak the exact same shapes.
 */

// ── Categories ────────────────────────────────────────────────
export const CATEGORIES = ['laptop', 'phone', 'tv', 'camera', 'headphones'] as const;
export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

export const CurrencySchema = z.enum(['INR', 'USD', 'EUR']);
export type Currency = z.infer<typeof CurrencySchema>;

// ── Requirements (extracted from natural language) ────────────
export const BudgetSchema = z.object({
  min: z.number().nonnegative().nullable(),
  max: z.number().positive().nullable(),
  currency: CurrencySchema.default('INR'),
});
export type Budget = z.infer<typeof BudgetSchema>;

/**
 * Priorities map a scoring dimension key (e.g. "performance") to an
 * importance in [0,1]. 0.5 is neutral. The scoring engine turns these into
 * concrete weights relative to each category's defaults.
 */
export const PrioritySchema = z.object({
  dimension: z.string(),
  importance: z.number().min(0).max(1),
});
export type Priority = z.infer<typeof PrioritySchema>;

export const RequirementsSchema = z.object({
  category: CategorySchema,
  rawQuery: z.string(),
  summary: z.string().describe('One concise sentence restating the user intent.'),
  budget: BudgetSchema,
  useCases: z.array(z.string()).default([]),
  priorities: z.array(PrioritySchema).default([]),
  mustHave: z.array(z.string()).default([]).describe('Hard constraints, e.g. "16GB RAM".'),
  niceToHave: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.8),
});
export type Requirements = z.infer<typeof RequirementsSchema>;

// ── Catalog entities ──────────────────────────────────────────
export const RetailerSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
});
export type Retailer = z.infer<typeof RetailerSchema>;

export const ProductOfferSchema = z.object({
  id: z.string(),
  productId: z.string(),
  retailerId: z.string(),
  retailerName: z.string(),
  sourceId: z.string().describe('Which ProductSource adapter produced this offer.'),
  price: z.number().positive(),
  currency: CurrencySchema,
  url: z.string(),
  inStock: z.boolean(),
  condition: z.enum(['new', 'refurbished', 'open-box']).default('new'),
  fetchedAt: z.string(),
});
export type ProductOffer = z.infer<typeof ProductOfferSchema>;

export const ReviewSummarySchema = z.object({
  sources: z.array(z.string()),
  totalCount: z.number().int().nonnegative(),
  averageRating: z.number().min(0).max(5),
  sentiment: z.object({
    positive: z.number().min(0).max(1),
    neutral: z.number().min(0).max(1),
    negative: z.number().min(0).max(1),
  }),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
});
export type ReviewSummary = z.infer<typeof ReviewSummarySchema>;

export const PricePointSchema = z.object({ date: z.string(), price: z.number().positive() });
export type PricePoint = z.infer<typeof PricePointSchema>;

export const PriceIntelligenceSchema = z.object({
  current: z.number().positive(),
  currency: CurrencySchema,
  /** null when we genuinely have no history — never fabricate. */
  avg30: z.number().positive().nullable(),
  low90: z.number().positive().nullable(),
  high90: z.number().positive().nullable(),
  trend: z.enum(['rising', 'falling', 'stable', 'unknown']),
  recommendation: z.enum(['buy', 'wait', 'neutral', 'insufficient-data']),
  expectedRange: z.object({ low: z.number(), high: z.number() }).nullable(),
  history: z.array(PricePointSchema),
  note: z.string().optional(),
});
export type PriceIntelligence = z.infer<typeof PriceIntelligenceSchema>;

/**
 * A canonical product is the de-duplicated entity resolved across sources.
 * `attributes` are normalized 0-100 scores per scoring dimension, computed
 * deterministically from raw specs + reviews during normalization — this is
 * what the scoring engine consumes.
 */
export const CanonicalProductSchema = z.object({
  id: z.string(),
  canonicalName: z.string(),
  brand: z.string(),
  category: CategorySchema,
  model: z.string(),
  imageUrl: z.string(),
  releaseYear: z.number().int(),
  /** Human-readable spec sheet. */
  specs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  /** Normalized 0-100 scores per dimension used by the scoring engine. */
  attributes: z.record(z.string(), z.number().min(0).max(100)),
  features: z.array(z.string()),
  offers: z.array(ProductOfferSchema),
  reviews: ReviewSummarySchema.nullable(),
  price: PriceIntelligenceSchema.nullable(),
  /** Source ids that actually contributed data to this product. */
  sources: z.array(z.string()),
});
export type CanonicalProduct = z.infer<typeof CanonicalProductSchema>;

// ── Scoring ───────────────────────────────────────────────────
export const ScoreBreakdownSchema = z.object({
  dimension: z.string(),
  label: z.string(),
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  contribution: z.number(),
});
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

export const ProductScoreSchema = z.object({
  productId: z.string(),
  overall: z.number().min(0).max(100),
  breakdown: z.array(ScoreBreakdownSchema),
  withinBudget: z.boolean(),
  budgetPenaltyApplied: z.number().min(0).max(1),
});
export type ProductScore = z.infer<typeof ProductScoreSchema>;

// ── Recommendation ────────────────────────────────────────────
export const EvidenceSchema = z.object({
  label: z.string(),
  value: z.string(),
  kind: z.enum(['spec', 'price', 'review', 'source', 'tradeoff']),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const RecommendationSchema = z.object({
  productId: z.string(),
  score: ProductScoreSchema,
  reasons: z.array(z.string()).describe('3-5 concise, evidence-grounded reasons it wins.'),
  tradeoffs: z.array(z.string()).describe('2-3 honest things you give up.'),
  evidence: z.array(EvidenceSchema),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const DontBuySchema = z.object({
  productId: z.string(),
  reason: z.enum([
    'poor-value',
    'better-alternative',
    'weak-battery',
    'review-concerns',
    'overpriced-now',
    'missing-required-feature',
  ]),
  explanation: z.string(),
});
export type DontBuy = z.infer<typeof DontBuySchema>;

export const AlternativesSchema = z.object({
  bestValue: z.string().nullable(),
  bestPerformance: z.string().nullable(),
  bestBattery: z.string().nullable(),
  cheapest: z.string().nullable(),
});
export type Alternatives = z.infer<typeof AlternativesSchema>;

export const SourceStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['queried', 'unavailable', 'skipped']),
  productCount: z.number().int().nonnegative(),
  note: z.string().optional(),
});
export type SourceStatus = z.infer<typeof SourceStatusSchema>;

export const ResearchResultSchema = z.object({
  sessionId: z.string(),
  requirements: RequirementsSchema,
  weights: z.array(ScoreBreakdownSchema.pick({ dimension: true, label: true, weight: true })),
  products: z.array(CanonicalProductSchema),
  scores: z.array(ProductScoreSchema),
  recommendation: RecommendationSchema,
  alternatives: AlternativesSchema,
  dontBuy: z.array(DontBuySchema),
  sources: z.array(SourceStatusSchema),
  createdAt: z.string(),
});
export type ResearchResult = z.infer<typeof ResearchResultSchema>;

// ── API request payloads ──────────────────────────────────────
export const StartResearchSchema = z.object({
  query: z.string().min(3).max(600),
  category: CategorySchema.optional(),
  demo: z.boolean().optional(),
});
export type StartResearch = z.infer<typeof StartResearchSchema>;

export const WhatIfSchema = z.object({
  sessionId: z.string(),
  budgetMax: z.number().positive().optional(),
  priorities: z.array(PrioritySchema).optional(),
});
export type WhatIf = z.infer<typeof WhatIfSchema>;

export const UserPreferencesSchema = z.object({
  defaultCurrency: CurrencySchema.default('INR'),
  priorities: z.array(PrioritySchema).default([]),
  brandAffinity: z.enum(['low', 'medium', 'high']).default('low'),
  budgetSensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
