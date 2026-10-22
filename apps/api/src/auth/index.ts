/**
 * Authentication module.
 *
 * Provides:
 *  - Google OAuth 2.0 flow (when GOOGLE_CLIENT_ID/SECRET configured)
 *  - Demo login (POST /api/auth/demo) — for local dev without Google OAuth
 *  - JWT session via httpOnly cookie `bw_session`
 *  - requireAuth preHandler
 *  - GET /api/auth/me
 *  - POST /api/auth/logout
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env, hasGoogleOAuth, isProduction } from '../config/env.js';
import { getPrisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

// Extend Fastify request with user
declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionUser;
  }
}

// ── JWT helpers ────────────────────────────────────────────────────────────

const COOKIE_NAME = 'bw_session';
const JWT_EXPIRES_IN = '7d';

export function signJwt(user: SessionUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    env.SESSION_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export function verifyJwt(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, env.SESSION_SECRET) as {
      sub: string;
      email: string;
      name: string;
      avatarUrl: string | null;
    };
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.avatarUrl ?? null,
    };
  } catch {
    return null;
  }
}

function setCookie(reply: FastifyReply, token: string): void {
  void reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

function clearCookie(reply: FastifyReply): void {
  void reply.clearCookie(COOKIE_NAME, { path: '/' });
}

// ── requireAuth preHandler ─────────────────────────────────────────────────

export async function requireAuth(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    await reply.code(401).send({ error: 'Unauthorized', message: 'Not authenticated' });
    return;
  }
  const user = verifyJwt(token);
  if (!user) {
    await reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired session' });
    return;
  }
  req.user = user;
}

/**
 * Falls back to a shared guest user when no session cookie is present.
 * Used on all data routes so they work without login.
 */
export const GUEST_USER: SessionUser = {
  id: 'guest',
  email: 'guest@buywise.app',
  name: 'Guest',
  avatarUrl: null,
};

export async function guestAuth(req: FastifyRequest): Promise<void> {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    const user = verifyJwt(token);
    if (user) { req.user = user; return; }
  }
  req.user = GUEST_USER;
}

/**
 * Attaches req.user when a valid session cookie is present, but never blocks.
 * Used on routes that work anonymously yet personalize when signed in
 * (e.g. research, so results attribute to the user's history).
 */
export async function optionalAuth(req: FastifyRequest): Promise<void> {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return;
  const user = verifyJwt(token);
  if (user) req.user = user;
}


// ── DB helpers ─────────────────────────────────────────────────────────────

/** Ephemeral in-memory user store for demo mode (no DB). */
const ephemeralUsers = new Map<string, SessionUser>();

async function upsertUser(profile: {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}): Promise<SessionUser> {
  const prisma = await getPrisma();

  if (prisma) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const user = await prisma.user.upsert({
        where: { googleId: profile.googleId },
        update: { name: profile.name, avatarUrl: profile.avatarUrl },
        create: {
          googleId: profile.googleId,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
        },
      });
      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        id: user.id as string,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        email: user.email as string,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        name: user.name as string,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        avatarUrl: (user.avatarUrl as string | null) ?? null,
      };
    } catch (err) {
      logger.warn({ err }, 'DB upsert failed, falling back to ephemeral user');
    }
  }

  // Ephemeral fallback
  const existingId = [...ephemeralUsers.entries()].find(
    ([, u]) => u.email === profile.email,
  )?.[0];
  const id = existingId ?? `ephemeral-${profile.googleId}`;
  const user: SessionUser = {
    id,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
  };
  ephemeralUsers.set(id, user);
  return user;
}

// ── Google OAuth fetch user info ───────────────────────────────────────────

async function fetchGoogleUserInfo(accessToken: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google userinfo failed: ${res.status}`);
  return res.json() as Promise<{
    sub: string;
    email: string;
    name: string;
    picture: string | null;
  }>;
}

// ── Fastify plugin ─────────────────────────────────────────────────────────

export async function authPlugin(app: FastifyInstance): Promise<void> {
  // ── Google OAuth (only when configured) ─────────────────────────────────
  if (hasGoogleOAuth) {
    const { default: oauth2 } = await import('@fastify/oauth2');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await app.register(oauth2 as any, {
      name: 'googleOAuth2',
      scope: ['openid', 'email', 'profile'],
      credentials: {
        client: {
          id: env.GOOGLE_CLIENT_ID!,
          secret: env.GOOGLE_CLIENT_SECRET!,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        auth: (oauth2 as any).GOOGLE_CONFIGURATION,
      },
      startRedirectPath: '/api/auth/google',
      callbackUri: `${env.BACKEND_URL ?? `http://localhost:${env.PORT}`}/api/auth/google/callback`,
    });

    // Google OAuth callback
    app.get('/api/auth/google/callback', async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const tokenResult = await (app as any).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const accessToken = String(tokenResult.token?.access_token ?? '');
        const profile = await fetchGoogleUserInfo(accessToken);

        const user = await upsertUser({
          googleId: profile.sub,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.picture,
        });

        const token = signJwt(user);
        setCookie(reply, token);
        await reply.redirect(`${env.FRONTEND_URL}/app`);
      } catch (err) {
        logger.error({ err }, 'Google OAuth callback failed');
        await reply.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
      }
    });
  }

  // ── Demo login (dev / no-OAuth mode) ────────────────────────────────────
  // Creates a demo session without Google OAuth.
  // Disable in strict production with Google by uncommenting the guard below.
  app.post('/api/auth/demo', async (_req: FastifyRequest, reply: FastifyReply) => {
    // Uncomment to restrict to non-prod:
    // if (isProduction && hasGoogleOAuth) {
    //   return reply.code(403).send({ error: 'Demo login not available in production' });
    // }
    const demoUser: SessionUser = {
      id: 'demo-user',
      email: 'demo@buywise.app',
      name: 'Demo User',
      avatarUrl: null,
    };
    const token = signJwt(demoUser);
    setCookie(reply, token);
    return reply.send({ user: demoUser });
  });

  // ── GET /api/auth/me ─────────────────────────────────────────────────────
  app.get('/api/auth/me', async (req: FastifyRequest, reply: FastifyReply) => {
    const token = req.cookies[COOKIE_NAME];
    if (!token) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    const user = verifyJwt(token);
    if (!user) {
      return reply.code(401).send({ error: 'Invalid session' });
    }
    return reply.send({ user });
  });

  // ── POST /api/auth/logout ────────────────────────────────────────────────
  app.post('/api/auth/logout', async (_req: FastifyRequest, reply: FastifyReply) => {
    clearCookie(reply);
    return reply.send({ success: true });
  });
}
