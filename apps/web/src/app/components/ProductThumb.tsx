import { useState } from 'react';
import { Box } from '@mui/material';
import { palette } from '@/theme/tokens';

/**
 * Product image with a graceful, on-brand fallback. Seeded/demo products may
 * point at remote images that fail; rather than a broken-image glyph we render
 * a tasteful monogram tile.
 */
export function ProductThumb({
  src,
  name,
  brand,
  size = 72,
  rounded = 0,
}: {
  src?: string;
  name: string;
  brand?: string;
  size?: number | string;
  rounded?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initials = (brand ?? name)
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const dim = typeof size === 'number' ? `${size}px` : size;

  if (!src || failed) {
    return (
      <Box
        aria-hidden
        sx={{
          width: dim,
          height: dim,
          borderRadius: `${rounded}px`,
          background: `linear-gradient(140deg, ${palette.paperSunken}, ${palette.surfaceWarm})`,
          border: `1px solid ${palette.hairline}`,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <Box sx={{ fontWeight: 680, color: palette.inkTertiary, letterSpacing: '-0.02em', fontSize: '1rem' }}>
          {initials}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      sx={{
        width: dim,
        height: dim,
        objectFit: 'cover',
        borderRadius: `${rounded}px`,
        border: `1px solid ${palette.hairline}`,
        background: palette.surfaceWarm,
        flexShrink: 0,
      }}
    />
  );
}
