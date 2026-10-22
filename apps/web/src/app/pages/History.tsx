import { Box, Typography, Skeleton, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Clock } from 'lucide-react';
import { CATEGORY_LABELS } from '@buywise/shared';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { palette, radius, shadow, scoreColor } from '@/theme/tokens';
import { PageHeader } from '@/app/components/PageHeader';
import { EmptyState, ErrorState } from '@/components/States';
import { SignalPill } from '@/components/primitives';

function groupByDate(items: Awaited<ReturnType<typeof api.getHistory>>) {
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const key = new Date(item.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const arr = groups.get(key) ?? [];
    arr.push(item);
    groups.set(key, arr);
  }
  return [...groups.entries()];
}

export default function History() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['history'], queryFn: api.getHistory });

  if (isLoading) return <Skeleton variant="rectangular" height={300} />;
  if (isError) return <ErrorState title="Couldn’t load your history" onRetry={() => refetch()} />;

  return (
    <Box sx={{ maxWidth: 820 }}>
      <PageHeader title="History" subtitle="Every research you’ve run. Reopen any one to revisit the decision." />
      {!data?.length ? (
        <EmptyState
          icon={<Clock size={24} />}
          title="No research history yet"
          description="Once you run a research, it’s saved here so you can reopen it or compare how your needs changed."
          action={{ label: 'Start researching', onClick: () => navigate('/app/research') }}
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          {groupByDate(data).map(([date, items]) => (
            <Box key={date}>
              <Typography variant="overline" sx={{ display: 'block', mb: 1.5 }}>
                {date}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {items.map((h) => (
                  <Box
                    key={h.id}
                    onClick={() => navigate(`/app/research/${h.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/app/research/${h.id}`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      borderRadius: radius.md,
                      background: palette.surface,
                      border: `1px solid ${palette.hairline}`,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      transition: 'box-shadow .2s, transform .2s',
                      '&:hover': { boxShadow: shadow.sm, transform: 'translateX(2px)' },
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                        <SignalPill signal="neutral">{CATEGORY_LABELS[h.category]}</SignalPill>
                      </Box>
                      <Typography sx={{ fontWeight: 540 }} noWrap>
                        {h.query}
                      </Typography>
                      <Typography variant="body2" noWrap>
                        Best match: {h.bestMatchName} · {formatPrice(h.bestMatchPrice)}
                      </Typography>
                    </Box>
                    <Box className="bw-numeric" sx={{ fontWeight: 680, fontSize: '1.2rem', color: scoreColor(h.bestMatchScore) }}>
                      {h.bestMatchScore}
                    </Box>
                    <IconButton size="small" aria-label="Open research">
                      <ChevronRight size={18} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
