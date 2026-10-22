import { useEffect, useState } from 'react';
import { AppBar, Toolbar, Box, Button, useScrollTrigger } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Logo } from '@/brand/Logo';
import { Container } from './primitives';
import { palette, zIndex } from '@/theme/tokens';

const LINKS = [
  { label: 'How it works', href: '#how' },
  { label: 'Trade-offs', href: '#tradeoffs' },
  { label: 'Price intelligence', href: '#price' },
];

export function MarketingNav() {
  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 24 });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: zIndex.header,
        background: trigger ? 'rgba(246,244,239,0.82)' : 'transparent',
        backdropFilter: trigger ? 'saturate(180%) blur(16px)' : 'none',
        borderBottom: trigger ? `1px solid ${palette.hairline}` : '1px solid transparent',
        transition: 'background .3s, border-color .3s, backdrop-filter .3s',
        color: palette.ink,
      }}
    >
      <Container>
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 }, justifyContent: 'space-between' }}>
          <RouterLink to="/" aria-label="BuyWise home">
            <Logo />
          </RouterLink>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
            {LINKS.map((l) => (
              <Button
                key={l.href}
                href={l.href}
                sx={{ color: palette.inkSecondary, fontWeight: 500, '&:hover': { color: palette.ink } }}
              >
                {l.label}
              </Button>
            ))}
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              opacity: mounted ? 1 : 0,
              transition: 'opacity .4s',
            }}
          >
            <Button
              component={RouterLink}
              to="/app"
              sx={{ color: palette.ink, display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Open app
            </Button>
            <Button component={RouterLink} to="/app/research" variant="contained">
              Start researching
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
