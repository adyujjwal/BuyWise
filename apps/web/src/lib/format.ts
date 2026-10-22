import type { Currency } from '@buywise/shared';

const SYMBOL: Record<Currency, string> = { INR: '₹', USD: '$', EUR: '€' };

/** Compact, locale-aware price. ₹1,20,000 style for INR. */
export function formatPrice(amount: number | null | undefined, currency: Currency = 'INR'): string {
  if (amount === null || amount === undefined) return '—';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return `${SYMBOL[currency]}${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount)}`;
}

/** Short price for dense UI: ₹1.2L / ₹60K. */
export function formatPriceShort(amount: number | null | undefined, currency: Currency = 'INR'): string {
  if (amount === null || amount === undefined) return '—';
  const s = SYMBOL[currency];
  if (currency === 'INR') {
    if (amount >= 1e7) return `${s}${(amount / 1e7).toFixed(amount % 1e7 === 0 ? 0 : 1)}Cr`;
    if (amount >= 1e5) return `${s}${(amount / 1e5).toFixed(amount % 1e5 === 0 ? 0 : 1)}L`;
    if (amount >= 1e3) return `${s}${Math.round(amount / 1e3)}K`;
  }
  return formatPrice(amount, currency);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function percent(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
