import type { Category } from './schemas.js';

/**
 * Per-category scoring dimensions. Each product carries a normalized 0-100
 * `attributes[dimension]` score; the engine combines these with weights.
 * `defaultWeight` values are the neutral baseline before user priorities tilt them.
 */
export interface DimensionDef {
  key: string;
  label: string;
  defaultWeight: number;
  /** Natural-language cues that imply the user cares about this dimension. */
  cues: string[];
  /** Dimensions that act as "the opposite" — boosting this dampens those. */
  tension?: string[];
}

const LAPTOP: DimensionDef[] = [
  { key: 'performance', label: 'Performance', defaultWeight: 0.26, cues: ['fast', 'docker', 'kubernetes', 'compile', 'development', 'dev', 'coding', 'virtual machine', 'ai', 'ml', 'rendering', 'cpu', 'multitask'] },
  { key: 'value', label: 'Value', defaultWeight: 0.2, cues: ['value', 'worth', 'budget', 'cheap', 'affordable', 'price to performance'] },
  { key: 'battery', label: 'Battery', defaultWeight: 0.18, cues: ['battery', 'all day', 'unplugged', 'long lasting'], tension: ['performance', 'gaming'] },
  { key: 'portability', label: 'Portability', defaultWeight: 0.14, cues: ['travel', 'light', 'lightweight', 'portable', 'carry', 'thin', 'commute', 'frequently'], tension: ['performance', 'gaming'] },
  { key: 'display', label: 'Display', defaultWeight: 0.1, cues: ['display', 'screen', 'oled', 'color', 'design work', 'photo', 'video editing', '4k'] },
  { key: 'gaming', label: 'Gaming', defaultWeight: 0.06, cues: ['gaming', 'game', 'fps', 'gpu', 'graphics', 'rtx', 'triple a'], tension: ['battery', 'portability'] },
  { key: 'reviews', label: 'Reviews', defaultWeight: 0.06, cues: ['reliable', 'reviews', 'well reviewed', 'trusted', 'build quality'] },
];

const PHONE: DimensionDef[] = [
  { key: 'performance', label: 'Performance', defaultWeight: 0.2, cues: ['fast', 'gaming', 'performance', 'chipset', 'snappy'] },
  { key: 'camera', label: 'Camera', defaultWeight: 0.24, cues: ['camera', 'photo', 'photography', 'video', 'vlog', 'low light'] },
  { key: 'battery', label: 'Battery', defaultWeight: 0.2, cues: ['battery', 'all day', 'charge'] },
  { key: 'value', label: 'Value', defaultWeight: 0.18, cues: ['value', 'budget', 'affordable', 'worth'] },
  { key: 'display', label: 'Display', defaultWeight: 0.1, cues: ['display', 'screen', 'amoled', 'bright', 'refresh'] },
  { key: 'reviews', label: 'Reviews', defaultWeight: 0.08, cues: ['reliable', 'reviews', 'trusted', 'build'] },
];

const TV: DimensionDef[] = [
  { key: 'picture', label: 'Picture quality', defaultWeight: 0.3, cues: ['picture', 'oled', 'qled', 'hdr', 'color', 'contrast', 'movie', 'cinema'] },
  { key: 'gaming', label: 'Gaming', defaultWeight: 0.22, cues: ['ps5', 'xbox', 'gaming', '120hz', 'vrr', 'console', 'low latency'] },
  { key: 'value', label: 'Value', defaultWeight: 0.2, cues: ['value', 'budget', 'affordable', 'worth'] },
  { key: 'sound', label: 'Sound', defaultWeight: 0.12, cues: ['sound', 'audio', 'speakers', 'dolby'] },
  { key: 'smart', label: 'Smart platform', defaultWeight: 0.08, cues: ['apps', 'smart', 'netflix', 'interface'] },
  { key: 'reviews', label: 'Reviews', defaultWeight: 0.08, cues: ['reliable', 'reviews', 'trusted'] },
];

const CAMERA: DimensionDef[] = [
  { key: 'imageQuality', label: 'Image quality', defaultWeight: 0.3, cues: ['image quality', 'sharp', 'sensor', 'low light', 'dynamic range'] },
  { key: 'portability', label: 'Portability', defaultWeight: 0.2, cues: ['travel', 'light', 'compact', 'carry', 'small'] },
  { key: 'video', label: 'Video', defaultWeight: 0.18, cues: ['video', '4k', 'vlog', 'film', 'cinematic'] },
  { key: 'value', label: 'Value', defaultWeight: 0.16, cues: ['value', 'budget', 'affordable'] },
  { key: 'autofocus', label: 'Autofocus', defaultWeight: 0.1, cues: ['autofocus', 'tracking', 'fast focus', 'wildlife', 'sports'] },
  { key: 'reviews', label: 'Reviews', defaultWeight: 0.06, cues: ['reliable', 'reviews', 'trusted'] },
];

const HEADPHONES: DimensionDef[] = [
  { key: 'noiseCancelling', label: 'Noise cancelling', defaultWeight: 0.26, cues: ['noise cancelling', 'anc', 'flight', 'plane', 'commute', 'office', 'quiet'] },
  { key: 'sound', label: 'Sound', defaultWeight: 0.26, cues: ['sound', 'audio', 'bass', 'audiophile', 'music', 'clarity'] },
  { key: 'comfort', label: 'Comfort', defaultWeight: 0.18, cues: ['comfort', 'long', 'all day', 'wear'] },
  { key: 'battery', label: 'Battery', defaultWeight: 0.14, cues: ['battery', 'long lasting', 'flight', 'travel'] },
  { key: 'value', label: 'Value', defaultWeight: 0.1, cues: ['value', 'budget', 'affordable'] },
  { key: 'reviews', label: 'Reviews', defaultWeight: 0.06, cues: ['reliable', 'reviews', 'trusted'] },
];

export const CATEGORY_DIMENSIONS: Record<Category, DimensionDef[]> = {
  laptop: LAPTOP,
  phone: PHONE,
  tv: TV,
  camera: CAMERA,
  headphones: HEADPHONES,
};

export const CATEGORY_LABELS: Record<Category, string> = {
  laptop: 'Laptop',
  phone: 'Phone',
  tv: 'TV',
  camera: 'Camera',
  headphones: 'Headphones',
};

/** Keyword cues used as a deterministic fallback for category detection. */
export const CATEGORY_CUES: Record<Category, string[]> = {
  laptop: ['laptop', 'notebook', 'macbook', 'ultrabook', 'development', 'coding', 'docker'],
  phone: ['phone', 'smartphone', 'iphone', 'android', 'mobile'],
  tv: ['tv', 'television', 'oled tv', 'ps5', 'xbox', 'home theatre'],
  camera: ['camera', 'mirrorless', 'dslr', 'photography', 'lens'],
  headphones: ['headphone', 'headphones', 'earbuds', 'earphones', 'anc', 'noise cancelling'],
};

export function detectCategory(query: string): Category {
  const q = query.toLowerCase();
  let best: Category = 'laptop';
  let bestScore = 0;
  for (const category of Object.keys(CATEGORY_CUES) as Category[]) {
    const score = CATEGORY_CUES[category].reduce((acc, cue) => (q.includes(cue) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }
  return best;
}

export function dimensionLabel(category: Category, key: string): string {
  return CATEGORY_DIMENSIONS[category].find((d) => d.key === key)?.label ?? key;
}
