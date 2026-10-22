import { Box, Typography, Button, Skeleton } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search, Clock, Bookmark, BellRing } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/format';
import { palette, radius, shadow, scoreColor } from '@/theme/tokens';

const EXAMPLES = [
  'A laptop for Java development, Docker, Kubernetes and gaming under ₹1.2L. I travel a lot.',
  'Best phone under ₹60K with a great camera',
  'Best TV for PS5 under ₹1L',
  'Noise cancelling headphones for long flights',
];

export default function Home() {
  const navigate = useNavigate();
  const history = useQuery({ queryKey: ['history'], queryFn: api.getHistory });
  const saved = useQuery({ queryKey: ['saved'], queryFn: api.getSaved });
  const watch = useQuery({ queryKey: ['watchlists'], queryFn: api.getWatchlists });

  return (
    <Box>
      {/* Greeting + primary CTA */}
      <Box
        sx={{
          p: { xs: 3, md: 5 },
          borderRadius: radius.xl,
          background: `radial-gradient(120% 150% at 90% 0%, ${palette.brandPressed} 0%, ${palette.night} 55%)`,
          color: palette.onNight,
          mb: 4,
          overflow: 'hidden',
        }}
      >
        <Typography variant="overline" sx={{ color: palette.onNightSecondary }}>
          Welcome back
        </Typography>
        <Typography variant="h2" sx={{ color: palette.onNight, mt: 0.5, maxWidth: 560 }}>
          What are we deciding today?
        </Typography>
        <Typography sx={{ mt: 1.5, color: palette.onNightSecondary, maxWidth: 480 }}>
          Describe what you want. BuyWise researches the sources, weighs it against your priorities and explains the call.
        </Typography>
        <Box sx={{ mt: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            component={RouterLink}
            to="/app/research"
            variant="contained"
            size="large"
            startIcon={<Search size={18} />}
            sx={{ background: palette.surface, color: palette.ink, '&:hover': { background: '#fff' } }}
          >
            Start new research
          </Button>
        </Box>
        <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {EXAMPLES.map((ex) => (
            <Box
              key={ex}
              onClick={() => navigate('/app/research', { state: { prefill: ex } })}
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: radius.pill,
                border: `1px solid ${palette.nightHairline}`,
                color: palette.onNightSecondary,
                fontSize: '0.8rem',
                cursor: 'pointer',
                '&:hover': { color: palette.onNight, borderColor: 'rgba(255,255,255,0.3)' },
              }}
            >
              {ex.length > 42 ? ex.slice(0, 42) + '…' : ex}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Stat tiles */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
        <StatTile icon={<Clock size={18} />} label="Research sessions" value={history.data?.length} to="/app/history" loading={history.isLoading} />
        <StatTile icon={<Bookmark size={18} />} label="Saved products" value={saved.data?.length} to="/app/saved" loading={saved.isLoading} />
        <StatTile icon={<BellRing size={18} />} label="Price watches" value={watch.data?.length} to="/app/watch" loading={watch.isLoading} />
      </Box>

      {/* Recent research */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Recent research</Typography>
        {!!history.data?.length && (
          <Button component={RouterLink} to="/app/history" endIcon={<ArrowRight size={15} />} sx={{ color: palette.inkSecondary }}>
            View all
          </Button>
        )}
      </Box>

      {history.isLoading ? (
        <Skeleton variant="rectangular" height={120} />
      ) : history.data?.length ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {history.data.slice(0, 4).map((h) => (
            <Box
              key={h.id}
              onClick={() => navigate(`/app/research/${h.id}`)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                p: 2,
                borderRadius: radius.md,
                background: palette.surface,
                border: `1px solid ${palette.hairline}`,
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'box-shadow .2s, transform .2s',
                '&:hover': { boxShadow: shadow.sm, transform: 'translateY(-1px)' },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: palette.inkTertiary }}>
                  {formatDate(h.createdAt)}
                </Typography>
                <Typography sx={{ fontWeight: 540 }} noWrap>
                  {h.query}
                </Typography>
                <Typography variant="body2" noWrap>
                  Best match: {h.bestMatchName} · {formatPrice(h.bestMatchPrice)}
                </Typography>
              </Box>
              <Box
                className="bw-numeric"
                sx={{ fontWeight: 680, fontSize: '1.25rem', color: scoreColor(h.bestMatchScore), flexShrink: 0 }}
              >
                {h.bestMatchScore}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ p: 4, borderRadius: radius.lg, border: `1px dashed ${palette.hairlineStrong}`, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 560 }}>No research yet</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, mb: 2 }}>
            Your past decisions will show up here, ready to reopen.
          </Typography>
          <Button component={RouterLink} to="/app/research" variant="contained">
            Run your first research
          </Button>
        </Box>
      )}
    </Box>
  );
}

function StatTile({
  icon,
  label,
  value,
  to,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  to: string;
  loading: boolean;
}) {
  return (
    <Box
      component={RouterLink}
      to={to}
      sx={{
        p: 2.5,
        borderRadius: radius.lg,
        background: palette.surface,
        border: `1px solid ${palette.hairline}`,
        display: 'block',
        transition: 'box-shadow .2s, transform .2s',
        '&:hover': { boxShadow: shadow.sm, transform: 'translateY(-2px)' },
      }}
    >
      <Box sx={{ color: palette.brand, mb: 1 }}>{icon}</Box>
      {loading ? (
        <Skeleton width={40} height={36} />
      ) : (
        <Typography className="bw-numeric" sx={{ fontSize: '1.9rem', fontWeight: 680, lineHeight: 1 }}>
          {value ?? 0}
        </Typography>
      )}
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {label}
      </Typography>
    </Box>
  );
}
