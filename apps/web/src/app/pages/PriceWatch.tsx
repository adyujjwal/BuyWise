import { Box, Typography, IconButton, Skeleton, LinearProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, Trash2, ExternalLink, Check } from 'lucide-react';
import { bestOfferPrice } from '@buywise/shared';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { palette, radius } from '@/theme/tokens';
import { PageHeader } from '@/app/components/PageHeader';
import { ProductThumb } from '@/app/components/ProductThumb';
import { EmptyState, ErrorState } from '@/components/States';
import { SignalPill } from '@/components/primitives';

export default function PriceWatch() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['watchlists'], queryFn: api.getWatchlists });
  const remove = useMutation({
    mutationFn: (id: string) => api.removeWatch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlists'] }),
  });

  if (isLoading) return <Skeleton variant="rectangular" height={300} />;
  if (isError) return <ErrorState title="Couldn’t load your price watches" onRetry={() => refetch()} />;

  return (
    <Box>
      <PageHeader
        title="Price Watch"
        subtitle="Set a target price. BuyWise tracks the gap and flags when it’s worth buying."
      />
      {!data?.length ? (
        <EmptyState
          icon={<BellRing size={24} />}
          title="No price watches yet"
          description="On any recommendation, tap “Watch price” to set a target. We’ll keep an eye on it."
          action={{ label: 'Start researching', onClick: () => navigate('/app/research') }}
        />
      ) : (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {data.map((w) => {
              const current = bestOfferPrice(w.product) ?? w.targetPrice;
              const reached = current <= w.targetPrice;
              // Progress toward target across a reference 25% drop window.
              const start = w.targetPrice * 1.25;
              const progress = Math.max(0, Math.min(100, ((start - current) / (start - w.targetPrice)) * 100));
              const offer = [...w.product.offers].filter((o) => o.inStock).sort((a, b) => a.price - b.price)[0];
              return (
                <Box
                  key={w.id}
                  sx={{ p: 2.5, borderRadius: radius.lg, background: palette.surface, border: `1px solid ${reached ? palette.brandSoftBorder : palette.hairline}`, overflow: 'hidden' }}
                >
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <ProductThumb src={w.product.imageUrl} name={w.product.canonicalName} brand={w.product.brand} size={56} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 560 }} noWrap>
                        {w.product.canonicalName}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.25, flexWrap: 'wrap' }} className="bw-numeric">
                        <Typography variant="body2">
                          Now <b>{formatPrice(current)}</b>
                        </Typography>
                        <Typography variant="body2" sx={{ color: palette.inkTertiary }}>
                          Target {formatPrice(w.targetPrice)}
                        </Typography>
                      </Box>
                    </Box>
                    {reached ? (
                      <SignalPill signal="positive"><Check size={12} /> Target reached</SignalPill>
                    ) : (
                      <SignalPill signal="neutral">Watching</SignalPill>
                    )}
                    {offer && (
                      <IconButton component="a" href={offer.url} target="_blank" rel="noopener noreferrer" size="small" aria-label="View offer">
                        <ExternalLink size={15} />
                      </IconButton>
                    )}
                    <IconButton size="small" onClick={() => remove.mutate(w.id)} aria-label="Remove watch">
                      <Trash2 size={15} />
                    </IconButton>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ mt: 2, '& .MuiLinearProgress-bar': { background: reached ? palette.brand : palette.caution } }}
                  />
                </Box>
              );
            })}
          </Box>
          <Box sx={{ mt: 3, p: 2, borderRadius: radius.md, background: palette.infoSoft }}>
            <Typography variant="body2" sx={{ color: palette.info }}>
              <b>How checks run.</b> The data model and UI support scheduled price checks. Automated background
              monitoring is wired for a worker/cron but not enabled on free hosting — see the roadmap in the README.
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}
