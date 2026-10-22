/**
 * ProductSource interface + intermediate raw shapes.
 *
 * Adapters return `RawProduct` and `RawOffer` from their sources.
 * The normalization layer de-dupes, resolves entities by `modelKey`, and
 * converts them into `CanonicalProduct` objects with typed `attributes`.
 */

import type { Requirements } from '@buywise/shared';

/**
 * Loosely-typed intermediate product shape from a single source.
 * Not yet normalized — may overlap with products from other adapters.
 */
export interface RawProduct {
  /** Stable identifier within this source. */
  externalId: string;
  /** Cross-source identity key (brand + model slug, e.g. "asus-rog-strix-g16-2024"). */
  modelKey: string;
  sourceId: string;
  canonicalName: string;
  brand: string;
  model: string;
  category: string;
  imageUrl: string;
  releaseYear: number;
  /** Human-readable spec pairs. */
  specs: Record<string, string | number | boolean>;
  /** Normalized 0-100 per dimension (from catalog seed). */
  attributes: Record<string, number>;
  features: string[];
  basePrice: number; // in INR
  currency: string;
  /** 90-day price history, or null if not available for this product. */
  priceHistory: Array<{ date: string; price: number }> | null;
  /** Aggregate review data. */
  reviewSummary: {
    sources: string[];
    totalCount: number;
    averageRating: number;
    sentiment: { positive: number; neutral: number; negative: number };
    pros: string[];
    cons: string[];
  } | null;
}

/**
 * A retailer-specific price/stock offer for a product.
 */
export interface RawOffer {
  externalProductId: string;
  modelKey: string;
  sourceId: string;
  retailerId: string;
  retailerName: string;
  price: number;
  currency: string;
  url: string;
  inStock: boolean;
  condition: 'new' | 'refurbished' | 'open-box';
}

/**
 * All adapters implement this interface.
 * Keep adapters thin — they only fetch/transform data from their source;
 * normalization, dedup, and scoring happen in separate services.
 */
export interface ProductSource {
  /** Stable short identifier, e.g. "amazon", "flipkart". */
  id: string;
  /** Human-readable display name. */
  name: string;
  /**
   * Search for products matching the given requirements.
   * Should return raw products; offers are fetched separately if the source
   * is also an offer source.
   */
  searchProducts(req: Requirements): Promise<RawProduct[]>;
  /**
   * Fetch full detail for a single product (used for detail page).
   * Returns null if not found.
   */
  getProductDetails(externalId: string): Promise<RawProduct | null>;
  /**
   * Fetch current price/stock offers for a product.
   * Manufacturer adapters may return empty array or MSRP-only.
   */
  getOffers(externalId: string): Promise<RawOffer[]>;
  /**
   * Whether this source provides purchasable offers (true) or is spec-only (false).
   */
  isOfferSource: boolean;
}
