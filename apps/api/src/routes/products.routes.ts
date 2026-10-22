/**
 * Product routes.
 *
 * GET  /api/products/:id       — get a single canonical product (with offers)
 * POST /api/products/compare   — compare 2-5 products with scores
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { deriveWeights, scoreAll } from '@buywise/shared';
import { resolveProduct, resolveProducts } from '../services/productIndex.js';
import { logger } from '../lib/logger.js';

const CompareBodySchema = z.object({
  productIds: z.array(z.string()).min(2).max(5),
});

export async function productRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/products/:id
  app.get(
    '/products/:id',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const product = await resolveProduct(req.params.id);
      if (!product) return reply.code(404).send({ error: 'Product not found' });
      return reply.send(product);
    },
  );

  // POST /api/products/compare
  app.post('/products/compare', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = CompareBodySchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid request', issues: body.error.flatten().fieldErrors });
    }

    try {
      const products = await resolveProducts(body.data.productIds);
      if (products.length < 2) {
        return reply.code(404).send({ error: 'Not enough matching products found.' });
      }

      const category = products[0]!.category;
      // Neutral weights (no priorities) + no budget cap for a fair side-by-side.
      const weights = deriveWeights(category, []);
      const scores = scoreAll(products, category, weights, { min: null, max: null, currency: 'INR' });

      return reply.send({ products, scores, category });
    } catch (err) {
      logger.error({ err, productIds: body.data.productIds }, 'Compare failed');
      return reply.code(500).send({ error: 'Comparison failed' });
    }
  });
}
