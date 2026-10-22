/**
 * Reliance Digital adapter (MOCK).
 *
 * TODO(real-integration): replace with Reliance Digital affiliate / partner API.
 * Reliance Digital stocks mainstream consumer electronics.
 * Prices vary ±6% vs base; covers ~75% of catalog.
 */

import type { Requirements } from '@buywise/shared';
import type { ProductSource, RawOffer, RawProduct } from './ProductSource.js';
import { FULL_CATALOG, filterByCategory } from './catalog.js';

const SOURCE_ID = 'reliance-digital';
const RETAILER_ID = 'reliance-digital';
const RETAILER_NAME = 'Reliance Digital';

function stocksProduct(modelKey: string): boolean {
  const hash = modelKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return hash % 4 !== 0; // ~75% coverage
}

function applyVariation(basePrice: number, modelKey: string): number {
  const hash = modelKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pct = ((hash % 12) - 6) / 100; // -0.06 to +0.06
  return Math.round((basePrice * (1 + pct)) / 100) * 100;
}

function toOffer(product: RawProduct): RawOffer {
  const price = applyVariation(product.basePrice, product.modelKey);
  const hash = product.modelKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    externalProductId: product.externalId,
    modelKey: product.modelKey,
    sourceId: SOURCE_ID,
    retailerId: RETAILER_ID,
    retailerName: RETAILER_NAME,
    price,
    currency: 'INR',
    url: `https://www.reliancedigital.in/search?q=${encodeURIComponent(product.canonicalName)}`,
    inStock: hash % 5 !== 0, // ~80% actually in stock
    condition: 'new',
  };
}

export class RelianceDigitalAdapter implements ProductSource {
  id = SOURCE_ID;
  name = RETAILER_NAME;
  isOfferSource = true;

  async searchProducts(req: Requirements): Promise<RawProduct[]> {
    // TODO(real-integration): Reliance Digital partner API
    return filterByCategory(req.category).filter((p) => stocksProduct(p.modelKey));
  }

  async getProductDetails(externalId: string): Promise<RawProduct | null> {
    const product = FULL_CATALOG.find((p) => p.externalId === externalId);
    if (!product || !stocksProduct(product.modelKey)) return null;
    return product;
  }

  async getOffers(externalId: string): Promise<RawOffer[]> {
    // TODO(real-integration): Reliance Digital pricing feed
    const product = FULL_CATALOG.find((p) => p.externalId === externalId);
    if (!product || !stocksProduct(product.modelKey)) return [];
    return [toOffer(product)];
  }
}
