/**
 * Manufacturer adapter (MOCK).
 *
 * TODO(real-integration): replace with manufacturer API / official spec pages
 * per brand (ASUS, Lenovo, Apple, Samsung, Sony, etc.).
 *
 * The manufacturer is the authoritative spec/review source.
 * It does NOT provide purchasable offers (isOfferSource = false).
 * Returns MSRP as a reference price only.
 */

import type { Requirements } from '@buywise/shared';
import type { ProductSource, RawOffer, RawProduct } from './ProductSource.js';
import { FULL_CATALOG, filterByCategory } from './catalog.js';

const SOURCE_ID = 'manufacturer';
const RETAILER_ID = 'manufacturer';
const RETAILER_NAME = 'Manufacturer (MSRP)';

export class ManufacturerAdapter implements ProductSource {
  id = SOURCE_ID;
  name = 'Manufacturer Specs';
  /**
   * Not a purchasable offer source — provides authoritative specs + MSRP only.
   * The normalization layer uses this source's specs/reviews as ground truth.
   */
  isOfferSource = false;

  async searchProducts(req: Requirements): Promise<RawProduct[]> {
    // TODO(real-integration): per-brand product API endpoints (ASUS ROG API,
    // Lenovo product catalog API, Apple product listings, etc.)
    return filterByCategory(req.category);
  }

  async getProductDetails(externalId: string): Promise<RawProduct | null> {
    // TODO(real-integration): fetch from brand website
    return FULL_CATALOG.find((p) => p.externalId === externalId) ?? null;
  }

  async getOffers(externalId: string): Promise<RawOffer[]> {
    // Manufacturer provides MSRP reference only, not a purchasable offer.
    const product = FULL_CATALOG.find((p) => p.externalId === externalId);
    if (!product) return [];

    return [
      {
        externalProductId: product.externalId,
        modelKey: product.modelKey,
        sourceId: SOURCE_ID,
        retailerId: RETAILER_ID,
        retailerName: RETAILER_NAME,
        price: product.basePrice, // MSRP
        currency: 'INR',
        url: `https://www.${product.brand.toLowerCase().replace(/\s+/g, '')}.com`,
        inStock: false, // Cannot buy direct from this source in demo
        condition: 'new',
      },
    ];
  }
}
