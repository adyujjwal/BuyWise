import { Box, Typography, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Logo } from '@/brand/Logo';
import { Container } from './primitives';
import { palette } from '@/theme/tokens';

const COLUMNS: Array<{ title: string; links: Array<{ label: string; to: string }> }> = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', to: '#how' },
      { label: 'Price intelligence', to: '#price' },
      { label: 'Start researching', to: '/app' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '#' },
      { label: 'Principles', to: '#' },
      { label: 'Contact', to: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '#' },
      { label: 'Terms', to: '#' },
      { label: 'How we source data', to: '#' },
    ],
  },
];

export function Footer() {
  return (
    <Box component="footer" sx={{ background: palette.night, color: palette.onNight, pt: { xs: 7, md: 9 }, pb: 5 }}>
      <Container>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.4fr repeat(3, 1fr)' },
            gap: { xs: 4, md: 6 },
          }}
        >
          <Box>
            <Logo tone="onDark" />
            <Typography sx={{ mt: 2, maxWidth: 300, color: palette.onNightSecondary, fontSize: '0.95rem' }}>
              Research less. Buy smarter. BuyWise does the product research so you can make confident buying decisions.
            </Typography>
          </Box>
          {COLUMNS.map((col) => (
            <Box key={col.title}>
              <Typography variant="overline" sx={{ color: palette.onNightSecondary }}>
                {col.title}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 1.5 }}>
                {col.links.map((l) => (
                  <Box
                    key={l.label}
                    component={l.to.startsWith('/') ? RouterLink : 'a'}
                    {...(l.to.startsWith('/') ? { to: l.to } : { href: l.to })}
                    sx={{
                      color: palette.onNightSecondary,
                      fontSize: '0.925rem',
                      '&:hover': { color: palette.onNight },
                      transition: 'color .2s',
                    }}
                  >
                    {l.label}
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
        <Divider sx={{ my: 4, borderColor: palette.nightHairline }} />
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            gap: 1.5,
            color: palette.onNightSecondary,
            fontSize: '0.85rem',
          }}
        >
          <span>© {new Date().getFullYear()} BuyWise. A portfolio project.</span>
          <span>Demo data is seeded and labelled. BuyWise never fabricates prices or reviews.</span>
        </Box>
      </Container>
    </Box>
  );
}
