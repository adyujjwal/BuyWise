import { Box, Typography, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { palette, layout } from '@/theme/tokens';

export function Eyebrow({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Box sx={{ width: 18, height: 2, borderRadius: 0, background: palette.brand }} />
      <Typography
        variant="overline"
        sx={{ color: tone === 'dark' ? palette.onNightSecondary : palette.brand, fontWeight: 650 }}
      >
        {children}
      </Typography>
    </Box>
  );
}

export function Container({
  children,
  sx,
  wide,
}: {
  children: ReactNode;
  sx?: SxProps<Theme>;
  wide?: boolean;
}) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: wide ? layout.wideMaxWidth : layout.maxWidth,
        mx: 'auto',
        px: { xs: 2.5, sm: 4, md: 5 },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

type Signal = 'positive' | 'caution' | 'negative' | 'neutral' | 'brand';

const SIGNAL_STYLES: Record<Signal, { bg: string; fg: string; border: string }> = {
  positive: { bg: palette.positiveSoft, fg: palette.positive, border: 'transparent' },
  caution: { bg: palette.cautionSoft, fg: '#8A6016', border: 'transparent' },
  negative: { bg: palette.negativeSoft, fg: palette.negative, border: 'transparent' },
  neutral: { bg: palette.paperSunken, fg: palette.inkSecondary, border: 'transparent' },
  brand: { bg: palette.brandSoft, fg: palette.brandPressed, border: palette.brandSoftBorder },
};

export function SignalPill({
  signal = 'neutral',
  children,
  icon,
}: {
  signal?: Signal;
  children: ReactNode;
  icon?: ReactNode;
}) {
  const s = SIGNAL_STYLES[signal];
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        px: 1.1,
        py: 0.4,
        borderRadius: 0,
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.01em',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {children}
    </Box>
  );
}
