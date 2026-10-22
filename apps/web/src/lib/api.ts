import type {
  ResearchResult,
  CanonicalProduct,
  ProductScore,
  UserPreferences,
  Priority,
  Category,
} from '@buywise/shared';

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new ApiError(0, 'We couldn’t reach BuyWise. Check your connection and try again.', 'network');
  }

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const b = body as { message?: string; error?: string; code?: string } | null;
    throw new ApiError(res.status, b?.message || b?.error || `Request failed (${res.status})`, b?.code);
  }
  return body as T;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  demo?: boolean;
}

export interface CompareResult {
  products: CanonicalProduct[];
  scores: ProductScore[];
  category: Category;
}

export interface HistoryItem {
  id: string;
  query: string;
  category: Category;
  createdAt: string;
  bestMatchName: string;
  bestMatchPrice: number | null;
  bestMatchScore: number;
}

export const api = {
  // auth
  me: async (): Promise<AuthUser | null> => {
    try {
      const res = await request<{ user: AuthUser }>('/auth/me');
      return res?.user ? { ...res.user, demo: res.user.email === 'demo@buywise.app' } : null;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  demoLogin: async (): Promise<AuthUser> => {
    const res = await request<{ user: AuthUser }>('/auth/demo', { method: 'POST' });
    return { ...res.user, demo: true };
  },
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  googleUrl: () => `${BASE}/auth/google`,
  config: () =>
    request<{ demoMode: boolean; hasOpenAI: boolean; hasDatabase: boolean; hasGoogleOAuth: boolean }>(
      '/health',
    ),

  // research
  startResearch: (query: string, opts?: { category?: Category; demo?: boolean }) =>
    request<ResearchResult>('/research', { method: 'POST', body: JSON.stringify({ query, ...opts }) }),
  getResearch: (id: string) => request<ResearchResult>(`/research/${id}`),
  whatIf: (id: string, payload: { budgetMax?: number; priorities?: Priority[] }) =>
    request<ResearchResult>(`/research/${id}/what-if`, { method: 'POST', body: JSON.stringify(payload) }),

  // products
  getProduct: (id: string) => request<CanonicalProduct>(`/products/${id}`),
  compare: (productIds: string[]) =>
    request<CompareResult>('/products/compare', { method: 'POST', body: JSON.stringify({ productIds }) }),

  // preferences
  getPreferences: () => request<UserPreferences>('/preferences'),
  savePreferences: (prefs: UserPreferences) =>
    request<UserPreferences>('/preferences', { method: 'PUT', body: JSON.stringify(prefs) }),

  // saved
  getSaved: () => request<CanonicalProduct[]>('/saved'),
  save: (productId: string) => request<void>('/saved', { method: 'POST', body: JSON.stringify({ productId }) }),
  unsave: (productId: string) => request<void>(`/saved/${productId}`, { method: 'DELETE' }),

  // watchlists
  getWatchlists: () =>
    request<Array<{ id: string; productId: string; targetPrice: number; status: string; product: CanonicalProduct }>>(
      '/watchlists',
    ),
  addWatch: (productId: string, targetPrice: number) =>
    request<void>('/watchlists', { method: 'POST', body: JSON.stringify({ productId, targetPrice }) }),
  removeWatch: (id: string) => request<void>(`/watchlists/${id}`, { method: 'DELETE' }),

  // history
  getHistory: () => request<HistoryItem[]>('/history'),

  health: () => request<{ status: string; demoMode: boolean; hasOpenAI: boolean; hasDatabase: boolean }>('/health'),
};
