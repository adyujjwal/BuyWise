/**
 * Flipkart adapter (MOCK).
 *
 * TODO(real-integration): replace with Flipkart Affiliate API or authorised
 * data feed: https://affiliate.flipkart.com/
 *
 * Covers ~90% of the catalog. Price is base ±3%.
 */

import type { Requirements } from '@buywise/shared';
import type { ProductSource, RawOffer, RawProduct } from './ProductSource.js';
import { FULL_CATALOG, filterByCategory } from './catalog.js';

const SOURCE_ID = 'flipkart';
const RETAILER_ID = 'flipkart';
const RETAILER_NAME = 'Flipkart';
const PRICE_VARIATION = 0.03; // ±3% — typically competitive with Amazon

function applyVariation(basePrice: number, modelKey: string): number {
  const hash = modelKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pct = ((hash % 6) - 3) / 100; // -0.03 to +0.03
  return Math.round((basePrice * (1 + pct)) / 100) * 100;
}

/** Flipkart lists ~90% of catalog. */
function stocksProduct(modelKey: string): boolean {
  const hash = modelKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return hash % 10 !== 3; // ~90% coverage, different exclusion to Amazon
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
    url: `https://www.flipkart.com/search?q=${encodeURIComponent(product.canonicalName)}`,
    inStock: stocksProduct(product.modelKey),
    condition: 'new',
  };
}

export class FlipkartAdapter implements ProductSource {
  id = SOURCE_ID;
  name = RETAILER_NAME;
  isOfferSource = true;

  async searchProducts(req: Requirements): Promise<RawProduct[]> {
    // TODO(real-integration): Flipkart Affiliate API product search
    return filterByCategory(req.category).filter((p) => stocksProduct(p.modelKey));
  }

  async getProductDetails(externalId: string): Promise<RawProduct | null> {
    // TODO(real-integration): Flipkart product details endpoint
    const product = FULL_CATALOG.find((p) => p.externalId === externalId);
    if (!product || !stocksProduct(product.modelKey)) return null;
    return product;
  }

  async getOffers(externalId: string): Promise<RawOffer[]> {
    // TODO(real-integration): Flipkart affiliate get offers
    const product = FULL_CATALOG.find((p) => p.externalId === externalId);
    if (!product || !stocksProduct(product.modelKey)) return [];
    return [toOffer(product)];
  }
}

if (PRICE_VARIATION > 0.1) {
  throw new Error('FlipkartAdapter: PRICE_VARIATION exceeds documented ±10% limit');
}
