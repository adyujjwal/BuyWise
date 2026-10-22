import { useMemo } from 'react';
import { Box, Typography, Button, IconButton, Skeleton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { X, Search, Trophy } from 'lucide-react';
import { bestOfferPrice, CATEGORY_DIMENSIONS, type CanonicalProduct } from '@buywise/shared';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { useCompareStore } from '@/store/compare';
import { palette, scoreColor } from '@/theme/tokens';
import { PageHeader } from '@/app/components/PageHeader';
import { ProductThumb } from '@/app/components/ProductThumb';
import { EmptyState, ErrorState } from '@/components/States';

const SPEC_ROWS = ['cpu', 'gpu', 'ram', 'storage', 'display', 'battery', 'weight', 'warranty'];

type Row = {
  key: string;
  label: string;
  kind: 'price' | 'score' | 'dimension' | 'spec' | 'rating';
  higherBetter?: boolean;
};

export default function Compare() {
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['compare', ids],
    queryFn: () => api.compare(ids),
    enabled: ids.length >= 2,
  });

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const dims = CATEGORY_DIMENSIONS[data.category];
    return [
      { key: 'price', label: 'Price', kind: 'price', higherBetter: false },
      { key: 'score', label: 'BuyWise score', kind: 'score', higherBetter: true },
      ...dims.map((d): Row => ({ key: `dim:${d.key}`, label: d.label, kind: 'dimension', higherBetter: true })),
      { key: 'rating', label: 'Rating', kind: 'rating', higherBetter: true },
      ...SPEC_ROWS.map((s): Row => ({ key: `spec:${s}`, label: s, kind: 'spec' })),
    ];
  }, [data]);

  if (ids.length < 2) {
    return (
      <Box>
        <PageHeader title="Compare" subtitle="Put 2–5 products side by side. Add candidates from any research result." />
        <EmptyState
          icon={<Search size={24} />}
          title="Pick at least two products to compare"
          description="Open a research result and use “Add to compare” on the winner or any alternative. They’ll collect here."
          action={{ label: 'Go to research', onClick: () => navigate('/app/research') }}
        />
      </Box>
    );
  }

  if (isLoading) return <Skeleton variant="rectangular" height={500} />;
  if (isError || !data) return <ErrorState title="Couldn’t load the comparison" onRetry={() => refetch()} />;

  const { products, scores } = data;
  const scoreById = new Map(scores.map((s) => [s.productId, s]));

  const getValue = (row: Row, p: CanonicalProduct): number | null => {
    const s = scoreById.get(p.id);
    switch (row.kind) {
      case 'price':
        return bestOfferPrice(p);
      case 'score':
        return s?.overall ?? null;
      case 'rating':
        return p.reviews?.averageRating ?? null;
      case 'dimension': {
        const key = row.key.replace('dim:', '');
        return s?.breakdown.find((b) => b.dimension === key)?.score ?? null;
      }
      default:
        return null;
    }
  };

  const winnerForRow = (row: Row): string | null => {
    if (row.kind === 'spec') return null;
    let best: { id: string; v: number } | null = null;
    for (const p of products) {
      const v = getValue(row, p);
      if (v === null) continue;
      const better = best === null || (row.higherBetter ? v > best.v : v < best.v);
      if (better) best = { id: p.id, v };
    }
    return best?.id ?? null;
  };

  const col = `minmax(150px, 1fr)`;

  return (
    <Box>
      <PageHeader
        title="Compare"
        subtitle={`${products.length} products, scored against the same priorities.`}
        actions={<Button variant="outlined" onClick={clear}>Clear all</Button>}
      />

      <Box sx={{ overflowX: 'auto', pb: 1 }}>
        <Box sx={{ minWidth: 180 + products.length * 160, display: 'grid', gridTemplateColumns: `180px repeat(${products.length}, ${col})` }}>
          {/* Header row */}
          <Box sx={{ position: 'sticky', left: 0, zIndex: 2, background: palette.paper }} />
          {products.map((p) => (
            <Box key={p.id} sx={{ p: 1.5, borderBottom: `1px solid ${palette.hairline}`, textAlign: 'center', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <IconButton size="small" onClick={() => remove(p.id)} aria-label={`Remove ${p.canonicalName}`}>
                  <X size={14} />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                <ProductThumb src={p.imageUrl} name={p.canonicalName} brand={p.brand} size={64} />
              </Box>
              <Typography variant="caption" sx={{ color: palette.inkTertiary, display: 'block' }}>
                {p.brand}
              </Typography>
              <Typography sx={{ fontWeight: 560, fontSize: '0.85rem', lineHeight: 1.3 }}>{p.canonicalName}</Typography>
            </Box>
          ))}

          {/* Data rows */}
          {rows.map((row, rowIdx) => {
            const winner = winnerForRow(row);
            return (
              <Box key={row.key} sx={{ display: 'contents' }}>
                <Box
                  sx={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    background: rowIdx % 2 ? palette.surfaceWarm : palette.paper,
                    p: 1.5,
                    borderBottom: `1px solid ${palette.hairline}`,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 540, textTransform: row.kind === 'spec' ? 'capitalize' : 'none' }}>
                    {row.label}
                  </Typography>
                </Box>
                {products.map((p) => {
                  const isWinner = winner === p.id && products.length > 1;
                  const numeric = getValue(row, p);
                  let display: React.ReactNode;
                  if (row.kind === 'spec') {
                    display = String(p.specs[row.key.replace('spec:', '')] ?? '—');
                  } else if (row.kind === 'price') {
                    display = formatPrice(numeric);
                  } else if (row.kind === 'rating') {
                    display = numeric !== null ? `${numeric.toFixed(1)}★` : '—';
                  } else if (row.kind === 'score' || row.kind === 'dimension') {
                    display = (
                      <Box component="span" sx={{ color: scoreColor(numeric ?? 0), fontWeight: 640 }}>
                        {numeric ?? '—'}
                      </Box>
                    );
                  }
                  return (
                    <Box
                      key={p.id}
                      className={row.kind !== 'spec' ? 'bw-numeric' : undefined}
                      sx={{
                        p: 1.5,
                        borderBottom: `1px solid ${palette.hairline}`,
                        background: isWinner ? palette.brandSoft : rowIdx % 2 ? palette.surfaceWarm : 'transparent',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        fontSize: '0.9rem',
                        fontWeight: isWinner ? 600 : 450,
                        position: 'relative',
                      }}
                    >
                      {isWinner && <Trophy size={12} color={palette.brand} style={{ flexShrink: 0 }} />}
                      {display}
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>
      <Typography variant="caption" sx={{ display: 'block', mt: 2, color: palette.inkTertiary }}>
        The <Trophy size={11} style={{ verticalAlign: 'middle' }} /> marks the leader for each measurable criterion. Specs are shown for context, not scored directly.
      </Typography>
    </Box>
  );
}
