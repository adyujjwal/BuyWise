/**
 * Amazon India adapter (MOCK).
 *
 * TODO(real-integration): replace with real Amazon Product Advertising API v5
 * https://webservices.amazon.in/paapi5/documentation/
 * or an authorised scraping pipeline with rate limiting.
 *
 * Reads the shared seeded catalog and returns:
 *  - ~85% of catalog products (randomly excludes a few to simulate catalog gaps)
 *  - Per-item price variation of ±5% vs base price
 *  - Amazon-specific retailer metadata and product URLs
 */

import type { Requirements } from '@buywise/shared';
import type { ProductSource, RawOffer, RawProduct } from './ProductSource.js';
import { FULL_CATALOG, filterByCategory } from './catalog.js';

const SOURCE_ID = 'amazon';
const RETAILER_ID = 'amazon-in';
const RETAILER_NAME = 'Amazon India';
const PRICE_VARIATION = 0.05; // ±5%

/** Apply a deterministic-enough price variation per product. */
function applyVariation(basePrice: number, modelKey: string): number {
  // Hash the modelKey to get a stable variation — not truly random per call.
  const hash = modelKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pct = ((hash % 10) - 5) / 100; // range -0.05 to +0.05
  const withVariation = basePrice * (1 + pct);
  return Math.round(withVariation / 100) * 100;
}

/** Amazon stocks ~85% of catalog — exclude products ending in '5' by hash. */
function stocksProduct(modelKey: string): boolean {
  const hash = modelKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return hash % 10 !== 5; // ~90% coverage
}

function toOffer(product: RawProduct): RawOffer {
  const price = applyVariation(product.basePrice, product.modelKey);
  return {
    externalProductId: product.externalId,
    modelKey: product.modelKey,
    sourceId: SOURCE_ID,
    retailerId: RETAILER_ID,
    retailerName: RETAILER_NAME,
    price,
    currency: 'INR',
    url: `https://www.amazon.in/s?k=${encodeURIComponent(product.canonicalName)}`,
    inStock: stocksProduct(product.modelKey),
    condition: 'new',
  };
}

export class AmazonAdapter implements ProductSource {
  id = SOURCE_ID;
  name = RETAILER_NAME;
  isOfferSource = true;

  async searchProducts(req: Requirements): Promise<RawProduct[]> {
    // TODO(real-integration): call Amazon PAAPI searchItems endpoint
    const results = filterByCategory(req.category);
    // Simulate network latency comment (actual mock is synchronous):
    return results.filter((p) => stocksProduct(p.modelKey));
  }

  async getProductDetails(externalId: string): Promise<RawProduct | null> {
    // TODO(real-integration): call Amazon PAAPI getItems endpoint
    const product = FULL_CATALOG.find((p) => p.externalId === externalId);
    if (!product || !stocksProduct(product.modelKey)) return null;
    return product;
  }

  async getOffers(externalId: string): Promise<RawOffer[]> {
    // TODO(real-integration): call Amazon PAAPI getVariations / listings
    const product = FULL_CATALOG.find((p) => p.externalId === externalId);
    if (!product || !stocksProduct(product.modelKey)) return [];
    return [toOffer(product)];
  }
}

// Validate price variation stays within declared bounds
if (PRICE_VARIATION > 0.1) {
  throw new Error('AmazonAdapter: PRICE_VARIATION exceeds documented ±10% limit');
}
