/**
 * Prisma seed script.
 *
 * Seeds:
 *  - Retailers (Amazon, Flipkart, Croma, Reliance Digital)
 *  - Products (all catalog entries)
 *  - ProductOffers (base prices from catalog)
 *  - ProductReviews
 *  - PriceHistory
 *
 * Guard: no-ops if DATABASE_URL is not set.
 *
 * Run: npm run db:seed  (from apps/api)
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { FULL_CATALOG } from '../src/sources/catalog.js';

const DATABASE_URL = process.env['DATABASE_URL'];

if (!DATABASE_URL) {
  console.log('No DATABASE_URL set — skipping seed (demo mode does not need it).');
  process.exit(0);
}

const prisma = new PrismaClient();

const RETAILERS = [
  { id: 'amazon-in', name: 'Amazon India', domain: 'amazon.in' },
  { id: 'flipkart', name: 'Flipkart', domain: 'flipkart.com' },
  { id: 'croma', name: 'Croma', domain: 'croma.com' },
  { id: 'reliance-digital', name: 'Reliance Digital', domain: 'reliancedigital.in' },
];

async function main() {
  console.log('Seeding database...');

  // ── Retailers ────────────────────────────────────────────────────────────
  for (const retailer of RETAILERS) {
    await prisma.retailer.upsert({
      where: { name: retailer.name },
      update: {},
      create: retailer,
    });
  }
  console.log(`Seeded ${RETAILERS.length} retailers`);

  // ── Products ─────────────────────────────────────────────────────────────
  let productCount = 0;
  for (const raw of FULL_CATALOG) {
    const product = await prisma.product.upsert({
      where: { brand_model: { brand: raw.brand, model: raw.model } },
      update: {
        canonicalName: raw.canonicalName,
        specs: raw.specs as object,
        attributes: raw.attributes as object,
        features: raw.features as unknown as object,
        imageUrl: raw.imageUrl,
        releaseYear: raw.releaseYear,
      },
      create: {
        id: raw.modelKey, // Use modelKey as stable ID
        canonicalName: raw.canonicalName,
        brand: raw.brand,
        model: raw.model,
        category: raw.category,
        imageUrl: raw.imageUrl,
        releaseYear: raw.releaseYear,
        specs: raw.specs as object,
        attributes: raw.attributes as object,
        features: raw.features as unknown as object,
      },
    });
    productCount++;

    // ── Offers (base prices at each retailer) ─────────────────────────────
    for (const retailer of RETAILERS) {
      const hash = raw.modelKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const pct = ((hash % 10) - 5) / 100;
      const price = Math.round((raw.basePrice * (1 + pct)) / 100) * 100;
      const inStock = hash % 5 !== 0;

      await prisma.productOffer.upsert({
        where: {
          // Use a pseudo-unique constraint via create + check
          id: `${retailer.id}-${product.id}`,
        },
        update: { price, inStock },
        create: {
          id: `${retailer.id}-${product.id}`,
          productId: product.id,
          retailerId: retailer.id,
          price,
          currency: 'INR',
          url: `https://${retailer.domain}/search?q=${encodeURIComponent(raw.canonicalName)}`,
          inStock,
          condition: 'new',
        },
      });
    }

    // ── Reviews ───────────────────────────────────────────────────────────
    if (raw.reviewSummary) {
      await prisma.productReview.upsert({
        where: { productId: product.id },
        update: {
          averageRating: raw.reviewSummary.averageRating,
          totalCount: raw.reviewSummary.totalCount,
          sentiment: raw.reviewSummary.sentiment as object,
          pros: raw.reviewSummary.pros as unknown as object,
          cons: raw.reviewSummary.cons as unknown as object,
        },
        create: {
          productId: product.id,
          sources: raw.reviewSummary.sources as unknown as object,
          totalCount: raw.reviewSummary.totalCount,
          averageRating: raw.reviewSummary.averageRating,
          sentiment: raw.reviewSummary.sentiment as object,
          pros: raw.reviewSummary.pros as unknown as object,
          cons: raw.reviewSummary.cons as unknown as object,
        },
      });
    }

    // ── Price history ─────────────────────────────────────────────────────
    if (raw.priceHistory && raw.priceHistory.length > 0) {
      // Delete existing history to avoid duplicates on re-seed
      await prisma.priceHistory.deleteMany({ where: { productId: product.id } });
      await prisma.priceHistory.createMany({
        data: raw.priceHistory.map((ph) => ({
          productId: product.id,
          date: new Date(ph.date),
          price: ph.price,
          currency: 'INR',
        })),
      });
    }
  }

  console.log(`Seeded ${productCount} products with offers, reviews, and price history`);
  console.log('Seed complete.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Seed failed:', err);
    prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  });
