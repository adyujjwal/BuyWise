import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { palette } from '@/theme/tokens';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'flex-end' },
        justifyContent: 'space-between',
        gap: 2,
        flexDirection: { xs: 'column', sm: 'row' },
        mb: 3.5,
      }}
    >
      <Box>
        <Typography variant="h3" sx={{ fontWeight: 640 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ mt: 0.75, maxWidth: 560, color: palette.inkSecondary }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1.25, flexShrink: 0 }}>{actions}</Box>}
    </Box>
  );
}
