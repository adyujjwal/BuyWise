/**
 * Zod-validated environment loader.
 * Always call dotenv first so .env values are in process.env before parsing.
 */

import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Server
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  BACKEND_URL: z.string().url().optional(),

  // Security
  SESSION_SECRET: z.string().min(8).default('dev-session-secret-change-in-prod'),

  // OpenAI (optional — enables AI agent; demo mode works without it)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),

  // Database (optional — demo mode works without it)
  DATABASE_URL: z.string().optional(),

  // Redis (optional — falls back to in-memory cache)
  REDIS_URL: z.string().optional(),

  // Google OAuth (optional — enables Google login)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const hasOpenAI = Boolean(env.OPENAI_API_KEY);
export const hasDatabase = Boolean(env.DATABASE_URL);
export const hasGoogleOAuth = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const isProduction = env.NODE_ENV === 'production';
