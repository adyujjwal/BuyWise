/**
 * Croma adapter (MOCK).
 *
 * TODO(real-integration): replace with Croma affiliate feed or partner API.
 * Croma (Tata Group) stocks premium/flagship range — ~65% of catalog.
 * Often slightly higher priced (+4-8%) than online-only retailers.
 */

import type { Requirements } from '@buywise/shared';
import type { ProductSource, RawOffer, RawProduct } from './ProductSource.js';
import { FULL_CATALOG, filterByCategory } from './catalog.js';

const SOURCE_ID = 'croma';
const RETAILER_ID = 'croma';
const RETAILER_NAME = 'Croma';

/** Croma skews premium — covers flagship and mid-range but not budget end. */
function stocksProduct(product: RawProduct): boolean {
  // Only stock products priced ₹20,000+
  if (product.basePrice < 20000) return false;
  const hash = product.modelKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return hash % 10 >= 3; // ~70% of remaining
}

function applyVariation(basePrice: number, modelKey: string): number {
  // Croma typically priced +4-8% vs street price (brick-and-mortar premium)
  const hash = modelKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pct = 0.04 + (hash % 4) / 100; // +4 to +7%
  return Math.round((basePrice * (1 + pct)) / 100) * 100;
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
    url: `https://www.croma.com/searchB?q=${encodeURIComponent(product.canonicalName)}`,
    inStock: true, // Croma marks listed items as in stock
    condition: 'new',
  };
}

export class CromaAdapter implements ProductSource {
  id = SOURCE_ID;
  name = RETAILER_NAME;
  isOfferSource = true;

  async searchProducts(req: Requirements): Promise<RawProduct[]> {
    // TODO(real-integration): Croma partner API or affiliate feed
    return filterByCategory(req.category).filter((p) => stocksProduct(p));
  }

  async getProductDetails(externalId: string): Promise<RawProduct | null> {
    const product = FULL_CATALOG.find((p) => p.externalId === externalId);
    if (!product || !stocksProduct(product)) return null;
    return product;
  }

  async getOffers(externalId: string): Promise<RawOffer[]> {
    // TODO(real-integration): Croma product pricing API
    const product = FULL_CATALOG.find((p) => p.externalId === externalId);
    if (!product || !stocksProduct(product)) return [];
    return [toOffer(product)];
  }
}
