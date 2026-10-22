# BuyWise API

Backend service for the BuyWise AI shopping decision platform.

## Quick start (demo mode — no API key required)

```bash
cd apps/api
npm run dev
```

The API starts at `http://localhost:4000`.

In demo mode (no `OPENAI_API_KEY`, no `DATABASE_URL`):
- All research uses the deterministic fallback agent (regex + heuristics).
- Product data comes from the seeded in-memory catalog (27 products across 5 categories).
- Sessions and user data are stored in-process memory (lost on restart).
- A demo login endpoint (`POST /api/auth/demo`) is available.

## Environment variables

Create `apps/api/.env`:

```env
# Required
SESSION_SECRET=your-session-secret-here          # min 8 chars

# Optional — enables AI-powered requirement extraction + prose
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini                        # default

# Optional — enables persistent storage
DATABASE_URL=postgresql://user:pass@localhost:5432/buywise

# Optional — enables Google OAuth login
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Optional — Redis for shared cache (falls back to in-process Map)
REDIS_URL=redis://localhost:6379

# Server config
PORT=4000
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:4000
NODE_ENV=development
```

## Key endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/demo` | — | Demo login (no OAuth needed) |
| GET | `/api/auth/me` | cookie | Current user |
| POST | `/api/auth/logout` | cookie | Clear session |
| GET | `/api/auth/google` | — | Start Google OAuth |
| POST | `/api/research` | optional | Run research |
| GET | `/api/research/:id` | — | Get results |
| POST | `/api/research/:id/what-if` | — | Re-score with new weights/budget |
| GET | `/api/products/:id` | — | Product detail |
| POST | `/api/products/compare` | — | Compare products |
| GET/PUT | `/api/preferences` | required | User preferences |
| GET/POST/DELETE | `/api/saved` | required | Saved products |
| GET/POST/DELETE | `/api/watchlists` | required | Price watches |
| GET | `/api/history` | required | Past research sessions |
| GET | `/api/health` | — | Health + feature flags |

## Demo mode walkthrough

1. Start with `npm run dev`
2. Demo login: `POST /api/auth/demo`
3. Run research: `POST /api/research` with `{ "query": "best laptop under 1.2 lakh for dev and gaming" }`
4. The fallback agent extracts budget (₹1,20,000), detects dev+gaming use cases, derives weights, scores all catalog laptops, and returns a full `ResearchResult`.
5. Try what-if: `POST /api/research/:id/what-if` with `{ "budgetMax": 80000 }` to re-score at a lower budget instantly.

## Database setup (optional)

```bash
# Start PostgreSQL and set DATABASE_URL in .env
npm run db:generate   # generate Prisma client
npm run db:push       # push schema to DB
npm run db:seed       # seed catalog data
```

## Architecture

```
src/
  config/env.ts          # Zod-validated env loader
  lib/
    logger.ts            # pino structured logger + logEvent()
    cache.ts             # Redis / in-memory cache abstraction
    prisma.ts            # Lazy PrismaClient singleton
  sources/
    ProductSource.ts     # Interface + RawProduct/RawOffer types
    catalog.ts           # Seeded demo catalog (27 products)
    AmazonAdapter.ts     # Mock — TODO: real PAAPI v5
    FlipkartAdapter.ts   # Mock — TODO: affiliate API
    CromaAdapter.ts      # Mock — TODO: partner feed
    RelianceDigitalAdapter.ts
    ManufacturerAdapter.ts  # Authoritative specs, no purchasable offers
    index.ts             # Source registry
  services/
    normalization.ts     # Entity resolution + price intelligence
    research.ts          # Research orchestration (runResearch, applyWhatIf)
  agent/
    tools.ts             # OpenAI function-calling tool schemas
    agent.ts             # AI orchestrator (extractRequirements, buildRecommendation)
    fallback.ts          # Deterministic fallback (no API key needed)
  auth/index.ts          # Google OAuth + demo login + JWT + requireAuth
  routes/
    research.routes.ts
    products.routes.ts
    preferences.routes.ts
    saved.routes.ts
    watchlists.routes.ts
    history.routes.ts
    health.routes.ts
  server.ts              # Fastify app + error handler + start()
prisma/
  schema.prisma          # PostgreSQL schema
  seed.ts                # Catalog → DB seed (no-op without DATABASE_URL)
```

## Stubbed / TODO items

- Real retailer integrations: each adapter has `// TODO(real-integration)` comments.
- Google OAuth: the `@fastify/oauth2` configuration expects a `GOOGLE_CONFIGURATION` property; verify the exact import path against your installed version of `@fastify/oauth2 ^7.x`.
- Price watch notifications: the `PriceWatch` model and endpoint exist but a background job / webhook for price alerts is not yet implemented.
- The `prisma/seed.ts` is outside `rootDir: src` and is compiled/run via `tsx` directly.

## Typecheck

```bash
npm run typecheck
```

Note: without running `prisma generate` first, `@prisma/client` imports in `lib/prisma.ts` and `prisma/seed.ts` will be unavailable. The rest of the codebase type-checks cleanly.
