/**
 * BuyWise design tokens — the single source of truth for the visual system.
 *
 * Direction: premium consumer tech. A warm, paper-like neutral foundation,
 * confident near-black ink, and ONE distinctive brand accent (a deep jade that
 * reads as "value / smart choice / go"). Color is spent intentionally — on
 * decisions, scores and signals — never as decoration.
 */

export const palette = {
  // Warm neutral foundation
  paper: '#F6F4EF', // app background — warm off-white
  paperSunken: '#EFEBE2', // insets, track backgrounds
  surface: '#FFFFFF',
  surfaceWarm: '#FCFBF8', // cards with a faint warm tint
  ink: '#1A1917', // primary text — warm near-black
  inkSecondary: '#55524C',
  inkTertiary: '#8A857D', // metadata / captions
  inkDisabled: '#B4AFA6',
  hairline: '#E7E3DA', // 1px borders
  hairlineStrong: '#D8D2C6',

  // Dark surfaces (hero, footer, score contexts)
  night: '#121311', // warm near-black panel
  nightRaised: '#1C1E1B',
  nightHairline: 'rgba(255,255,255,0.09)',
  onNight: '#F3F1EC',
  onNightSecondary: 'rgba(243,241,236,0.64)',

  // Brand accent — "BuyWise jade"
  brand: '#0F7A52',
  brandHover: '#0C6544',
  brandPressed: '#0A5338',
  brandSoft: '#E4F1EA', // tint backgrounds
  brandSoftBorder: '#BFE0CF',
  brandBright: '#2BA878',

  // Semantic signals (used sparingly, never as blanket green/red)
  positive: '#1E8E5A', // good / price drop
  positiveSoft: '#E6F2EA',
  caution: '#B9822B', // "wait"
  cautionSoft: '#F6ECD7',
  negative: '#BE4F39', // "don't buy" / overpriced
  negativeSoft: '#F6E6E1',
  info: '#4F6670',
  infoSoft: '#E8EDEF',
} as const;

/** Confidence scale for the BuyWise score (0-100). */
export function scoreColor(score: number): string {
  if (score >= 88) return palette.brand;
  if (score >= 75) return palette.positive;
  if (score >= 60) return palette.caution;
  return palette.negative;
}

export const typography = {
  fontFamily:
    "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  // Tabular figures for all numeric/stat contexts (prices, scores).
  numericFeatures: "'tnum' 1, 'cv05' 1, 'ss01' 1",
} as const;

export const radius = {
  xs: 0,
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  pill: 0,
} as const;

export const shadow = {
  // Soft, layered, low-contrast — no harsh drop shadows.
  xs: '0 1px 2px rgba(26,25,23,0.05)',
  sm: '0 2px 6px rgba(26,25,23,0.06), 0 1px 2px rgba(26,25,23,0.04)',
  md: '0 8px 24px -8px rgba(26,25,23,0.12), 0 2px 6px rgba(26,25,23,0.05)',
  lg: '0 24px 60px -20px rgba(26,25,23,0.22), 0 6px 16px -8px rgba(26,25,23,0.10)',
  focus: `0 0 0 3px ${palette.brandSoftBorder}`,
} as const;

export const motion = {
  // Restrained easing — nothing bouncy by default.
  ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
  easeCss: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  fast: 0.18,
  base: 0.32,
  slow: 0.6,
} as const;

export const layout = {
  maxWidth: 1200,
  wideMaxWidth: 1320,
  gutter: 24,
} as const;

export const zIndex = {
  header: 1100,
  overlay: 1200,
  modal: 1300,
  toast: 1400,
} as const;
