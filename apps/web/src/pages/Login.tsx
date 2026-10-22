import { useState, useEffect } from 'react';
import { Box, Typography, Button, Divider, CircularProgress } from '@mui/material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Logo } from '@/brand/Logo';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { palette, radius, shadow } from '@/theme/tokens';

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function Login() {
  const { demoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/app';
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .config()
      .then((c) => {
        if (active) setGoogleEnabled(c.hasGoogleOAuth);
      })
      .catch(() => {
        if (active) setGoogleEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleDemo = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      await demoLogin();
      navigate(from, { replace: true });
    } catch {
      setError('Couldn’t start the demo session. The API may be offline — check it’s running on port 4000.');
      setDemoLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      {/* Brand panel */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          background: `radial-gradient(120% 120% at 20% 15%, ${palette.nightRaised}, ${palette.night})`,
          color: palette.onNight,
        }}
      >
        <RouterLink to="/">
          <Logo tone="onDark" />
        </RouterLink>
        <Box>
          <Typography variant="h2" sx={{ color: palette.onNight, maxWidth: 420 }}>
            Research less. Buy smarter.
          </Typography>
          <Typography sx={{ mt: 2, color: palette.onNightSecondary, maxWidth: 380 }}>
            Sign in to save research, track prices and keep your shopping preferences — or jump straight into the demo.
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: palette.onNightSecondary }}>
          Your preferences stay yours. BuyWise shows you exactly what it stores.
        </Typography>
      </Box>

      {/* Auth panel */}
      <Box sx={{ display: 'grid', placeItems: 'center', p: { xs: 3, md: 6 }, background: palette.paper }}>
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 4 }}>
            <RouterLink to="/">
              <Logo />
            </RouterLink>
          </Box>
          <Typography variant="h3">Sign in to BuyWise</Typography>
          <Typography variant="body2" sx={{ mt: 1, mb: 4 }}>
            {googleEnabled
              ? 'Continue with Google, or explore the full product in demo mode.'
              : 'Explore the full product in demo mode — no account needed.'}
          </Typography>

          {googleEnabled && (
            <>
              <Button
                component="a"
                href={api.googleUrl()}
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<GoogleGlyph />}
                sx={{ justifyContent: 'center', mb: 2 }}
              >
                Continue with Google
              </Button>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
                <Divider sx={{ flex: 1 }} />
                <Typography variant="caption">or</Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>
            </>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleDemo}
            disabled={demoLoading}
            endIcon={demoLoading ? <CircularProgress size={16} color="inherit" /> : <ArrowRight size={18} />}
          >
            {demoLoading ? 'Starting demo…' : 'Continue in demo mode'}
          </Button>

          {error && (
            <Box sx={{ mt: 2, p: 1.75, borderRadius: radius.sm, background: palette.negativeSoft, boxShadow: shadow.xs }}>
              <Typography variant="body2" sx={{ color: palette.negative }}>
                {error}
              </Typography>
            </Box>
          )}

          <Typography variant="caption" sx={{ display: 'block', mt: 3, color: palette.inkTertiary }}>
            Demo mode uses seeded, clearly-labelled product data and requires no account. Nothing is charged.
          </Typography>

          <Button component={RouterLink} to="/" startIcon={<ArrowLeft size={16} />} sx={{ mt: 4, color: palette.inkSecondary }}>
            Back to home
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
