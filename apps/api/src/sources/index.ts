/**
 * Source registry.
 *
 * Lists all enabled product source adapters.
 * Add or remove adapters here to control which sources are queried.
 */

import type { ProductSource } from './ProductSource.js';
import { AmazonAdapter } from './AmazonAdapter.js';
import { FlipkartAdapter } from './FlipkartAdapter.js';
import { CromaAdapter } from './CromaAdapter.js';
import { RelianceDigitalAdapter } from './RelianceDigitalAdapter.js';
import { ManufacturerAdapter } from './ManufacturerAdapter.js';

let _sources: ProductSource[] | null = null;

/**
 * Returns the singleton list of enabled product sources.
 * Sources are instantiated once and reused — stateless adapters only.
 */
export function getSources(): ProductSource[] {
  if (_sources) return _sources;
  _sources = [
    new ManufacturerAdapter(), // First: authoritative specs / reviews
    new AmazonAdapter(),
    new FlipkartAdapter(),
    new CromaAdapter(),
    new RelianceDigitalAdapter(),
  ];
  return _sources;
}

export type { ProductSource };
export { type RawProduct, type RawOffer } from './ProductSource.js';
