import { Box, Typography, Button, IconButton, Skeleton, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Trash2, GitCompareArrows, ExternalLink, Bookmark } from 'lucide-react';
import { bestOfferPrice } from '@buywise/shared';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { useCompareStore } from '@/store/compare';
import { palette, radius, shadow } from '@/theme/tokens';
import { PageHeader } from '@/app/components/PageHeader';
import { ProductThumb } from '@/app/components/ProductThumb';
import { EmptyState, ErrorState } from '@/components/States';
import { SignalPill } from '@/components/primitives';

export default function Saved() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const addToCompare = useCompareStore((s) => s.add);
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['saved'], queryFn: api.getSaved });
  const unsave = useMutation({
    mutationFn: (id: string) => api.unsave(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved'] });
      setToast('Removed from saved');
    },
  });

  if (isLoading) return <Skeleton variant="rectangular" height={300} />;
  if (isError) return <ErrorState title="Couldn’t load your saved products" onRetry={() => refetch()} />;

  return (
    <Box>
      <PageHeader title="Saved" subtitle="Products you’ve kept for later, with live price signals." />
      {!data?.length ? (
        <EmptyState
          icon={<Bookmark size={24} />}
          title="Nothing saved yet"
          description="Save a recommendation or an alternative and it’ll wait for you here."
          action={{ label: 'Start researching', onClick: () => navigate('/app/research') }}
        />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
          {data.map((p) => {
            const price = bestOfferPrice(p);
            const offer = [...p.offers].filter((o) => o.inStock).sort((a, b) => a.price - b.price)[0];
            return (
              <Box
                key={p.id}
                sx={{
                  p: 2,
                  borderRadius: radius.lg,
                  background: palette.surface,
                  border: `1px solid ${palette.hairline}`,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'box-shadow .2s, transform .2s',
                  '&:hover': { boxShadow: shadow.sm, transform: 'translateY(-2px)' },
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <ProductThumb src={p.imageUrl} name={p.canonicalName} brand={p.brand} size={60} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" sx={{ color: palette.inkTertiary }}>
                      {p.brand}
                    </Typography>
                    <Typography sx={{ fontWeight: 560, fontSize: '0.95rem', lineHeight: 1.3 }}>{p.canonicalName}</Typography>
                  </Box>
                  <IconButton size="small" onClick={() => unsave.mutate(p.id)} aria-label="Remove">
                    <Trash2 size={15} />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5 }}>
                  <Typography className="bw-numeric" sx={{ fontWeight: 680, fontSize: '1.1rem' }}>
                    {formatPrice(price)}
                  </Typography>
                  {p.price?.recommendation === 'buy' && <SignalPill signal="positive">Good price</SignalPill>}
                  {p.price?.recommendation === 'wait' && <SignalPill signal="caution">Consider waiting</SignalPill>}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<GitCompareArrows size={14} />}
                    onClick={() => { addToCompare(p.id); setToast('Added to compare'); }}
                    sx={{ flex: 1 }}
                  >
                    Compare
                  </Button>
                  {offer && (
                    <IconButton component="a" href={offer.url} target="_blank" rel="noopener noreferrer" size="small" sx={{ border: `1px solid ${palette.hairlineStrong}`, borderRadius: radius.sm }} aria-label="View offer">
                      <ExternalLink size={15} />
                    </IconButton>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
      <Snackbar open={!!toast} autoHideDuration={2200} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: radius.md }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
