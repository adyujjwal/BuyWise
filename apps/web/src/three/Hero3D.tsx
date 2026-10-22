import { lazy, Suspense, useMemo } from 'react';
import { Box, useMediaQuery } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import { BuyWiseMark } from '@/brand/Logo';
import { palette } from '@/theme/tokens';

const DecisionEngine = lazy(() => import('@buywise/decision-engine-3d'));

function hasWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

/** Elegant static stand-in when 3D is disabled, unsupported, or unwanted. */
function StaticHero() {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: `radial-gradient(120% 120% at 70% 20%, ${palette.nightRaised} 0%, ${palette.night} 60%)`,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: '50%',
          border: `1px solid ${palette.nightHairline}`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          border: `1px solid ${palette.nightHairline}`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: '50%',
          filter: 'blur(44px)',
          background: palette.brand,
          opacity: 0.26,
        }}
      />
      <Box sx={{ position: 'relative' }}>
        <BuyWiseMark size={76} tone="onDark" />
      </Box>
    </Box>
  );
}

export function Hero3D({ enabled = true }: { enabled?: boolean }) {
  const reduce = useReducedMotion();
  const isMobile = useMediaQuery('(max-width:900px)');
  const isSmall = useMediaQuery('(max-width:1200px)');
  const envEnabled = import.meta.env.VITE_ENABLE_3D !== 'false';

  const canRender = useMemo(() => enabled && envEnabled && !reduce && hasWebGL(), [enabled, envEnabled, reduce]);

  if (!canRender) return <StaticHero />;

  // Simplify (fewer cards, no shadows, lower dpr) on constrained viewports.
  const quality = isMobile || isSmall ? 'low' : 'high';

  return (
    <Suspense fallback={<StaticHero />}>
      <DecisionEngine quality={quality} />
    </Suspense>
  );
}
