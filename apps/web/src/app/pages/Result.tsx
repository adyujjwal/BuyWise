import { useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Collapse,
  Snackbar,
  Alert,
  Tooltip,
  Skeleton,
} from '@mui/material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  BellRing,
  GitCompareArrows,
  ExternalLink,
  ChevronDown,
  Ban,
  ArrowUpRight,
} from 'lucide-react';
import { bestOfferPrice, type ResearchResult, type ProductScore, type CanonicalProduct } from '@buywise/shared';
import { api, ApiError } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { type WhatIfComputed } from '@/lib/recommend';
import { useCompareStore } from '@/store/compare';
import { palette, radius, shadow, scoreColor } from '@/theme/tokens';
import { ScoreRing, ScoreBar } from '@/components/Score';
import { SignalPill } from '@/components/primitives';
import { ProductThumb } from '@/app/components/ProductThumb';
import { PriceIntel } from '@/app/components/PriceIntel';
import { WhatIfPanel } from '@/app/components/WhatIfPanel';
import { ErrorState } from '@/components/States';

const DONT_BUY_LABEL: Record<string, string> = {
  'poor-value': 'Poor value',
  'better-alternative': 'Better option exists',
  'weak-battery': 'Weak battery',
  'review-concerns': 'Review concerns',
  'overpriced-now': 'Overpriced right now',
  'missing-required-feature': 'Missing a must-have',
};

export default function Result() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToCompare = useCompareStore((s) => s.add);
  const [whatIf, setWhatIf] = useState<WhatIfComputed | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { data: result, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['research', id],
    queryFn: () => api.getResearch(id!),
    enabled: !!id,
  });

  const saveMut = useMutation({ mutationFn: (pid: string) => api.save(pid), onSuccess: () => setToast('Saved to your list') });
  const watchMut = useMutation({
    mutationFn: ({ pid, target }: { pid: string; target: number }) => api.addWatch(pid, target),
    onSuccess: () => setToast('Price watch created'),
  });

  const handleCompute = useCallback((c: WhatIfComputed | null) => setWhatIf(c), []);

  const byId = useMemo(
    () => new Map((result?.products ?? []).map((p) => [p.id, p] as const)),
    [result],
  );

  if (isLoading) return <ResultSkeleton />;
  if (isError || !result) {
    const err = error as ApiError;
    return (
      <ErrorState
        isNetwork={err?.status === 0}
        title={err?.status === 404 ? "That research session wasn't found" : "Couldn't load this recommendation"}
        description={
          err?.status === 404
            ? "It may have expired. Start a fresh research and we'll rebuild it."
            : err?.message
        }
        onRetry={() => (err?.status === 404 ? navigate('/app/research') : refetch())}
      />
    );
  }

  // Effective view = what-if override, else the server recommendation.
  const winnerId = whatIf?.winnerId ?? result.recommendation.productId;
  const winnerScore: ProductScore =
    whatIf?.scores.find((s) => s.productId === winnerId) ?? result.recommendation.score;
  const reasons = whatIf?.reasons ?? result.recommendation.reasons;
  const tradeoffs = whatIf?.tradeoffs ?? result.recommendation.tradeoffs;
  const alternatives = whatIf?.alternatives ?? result.alternatives;
  const dontBuy = whatIf?.dontBuy ?? result.dontBuy;
  const product = byId.get(winnerId);

  if (!product) return <ErrorState title="Incomplete recommendation" onRetry={() => refetch()} />;

  const breakdown = [...winnerScore.breakdown].sort((a, b) => b.weight - a.weight);
  const bestOffer = [...product.offers].filter((o) => o.inStock).sort((a, b) => a.price - b.price)[0] ?? product.offers[0];
  const price = bestOfferPrice(product);
  const listPrice = product.price?.avg30 && price && product.price.avg30 > price ? product.price.avg30 : null;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Button
            startIcon={<ArrowLeft size={16} />}
            onClick={() => navigate('/app/research')}
            sx={{ color: palette.inkSecondary, ml: -1, mb: 0.5 }}
          >
            New research
          </Button>
          <Typography variant="body2" sx={{ color: palette.inkTertiary, maxWidth: 620, wordBreak: 'break-word' }}>
            {'"'}{result.requirements.rawQuery}{'"'}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<GitCompareArrows size={16} />}
          onClick={() => {
            result.products.slice(0, 3).forEach((p) => addToCompare(p.id));
            navigate('/app/compare');
          }}
        >
          Compare candidates
        </Button>
      </Box>

      {/* Best match hero */}
      <Box
        component={motion.div}
        key={winnerId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        sx={{
          p: { xs: 2.5, md: 4 },
          borderRadius: radius.xl,
          background: palette.surface,
          border: `1px solid ${palette.hairline}`,
          boxShadow: shadow.md,
        }}
      >
        <Box sx={{ display: 'flex', gap: { xs: 2.5, md: 4 }, flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' } }}>
          <ScoreRing score={winnerScore.overall} />
          <ProductThumb src={product.imageUrl} name={product.canonicalName} brand={product.brand} size={96} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <SignalPill signal="brand">Your best match</SignalPill>
              <AnimatePresence>
                {whatIf?.movement && (
                  <Box component={motion.div} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <SignalPill signal="positive">
                      <ArrowUpRight size={12} /> Moved #{whatIf.movement.from} → #{whatIf.movement.to}
                    </SignalPill>
                  </Box>
                )}
              </AnimatePresence>
            </Box>
            <Typography variant="caption" sx={{ display: 'block', mt: 1.25, color: palette.inkTertiary }}>
              {product.brand}
            </Typography>
            <Typography variant="h3">{product.canonicalName}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, mt: 1, flexWrap: 'wrap' }} className="bw-numeric">
              <Typography sx={{ fontSize: '1.75rem', fontWeight: 680, letterSpacing: '-0.02em' }}>
                {formatPrice(price, result.requirements.budget.currency)}
              </Typography>
              {listPrice && (
                <Typography variant="body2" sx={{ textDecoration: 'line-through', color: palette.inkTertiary }}>
                  {formatPrice(listPrice, result.requirements.budget.currency)}
                </Typography>
              )}
              {bestOffer && (
                <Typography variant="caption" sx={{ color: palette.inkSecondary }}>
                  Best price at <b>{bestOffer.retailerName}</b>
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.25, mt: 3, flexWrap: 'wrap' }}>
          {bestOffer && (
            <Button
              variant="contained"
              component="a"
              href={bestOffer.url}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<ExternalLink size={16} />}
            >
              View offer
            </Button>
          )}
          <Button variant="outlined" startIcon={<Bookmark size={16} />} onClick={() => saveMut.mutate(winnerId)} disabled={saveMut.isPending}>
            Save
          </Button>
          <Tooltip title={price ? `Watch below ${formatPrice(Math.round(price * 0.92))}` : 'Watch price'}>
            <span>
              <Button
                variant="outlined"
                startIcon={<BellRing size={16} />}
                disabled={!price || watchMut.isPending}
                onClick={() => price && watchMut.mutate({ pid: winnerId, target: Math.round(price * 0.92) })}
              >
                Watch price
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Body grid */}
      <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.55fr 1fr' }, gap: 3, alignItems: 'start' }}>
        {/* Main column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <Panel>
            <SectionTitle>Why this wins</SectionTitle>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
              {reasons.map((r) => (
                <Box key={r} sx={{ display: 'flex', gap: 1.5 }}>
                  <BadgeCheck size={19} color={palette.brand} style={{ flexShrink: 0, marginTop: 1 }} />
                  <Typography variant="body2" sx={{ color: palette.ink }}>
                    {r}
                  </Typography>
                </Box>
              ))}
            </Box>

            {tradeoffs.length > 0 && (
              <>
                <SectionTitle sx={{ mt: 4 }}>What you give up</SectionTitle>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 2 }}>
                  {tradeoffs.map((t) => (
                    <Box key={t} sx={{ display: 'flex', gap: 1.5 }}>
                      <Box sx={{ width: 19, display: 'grid', placeItems: 'center', flexShrink: 0, mt: 0.5 }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: palette.caution }} />
                      </Box>
                      <Typography variant="body2">{t}</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Panel>

          {/* Score breakdown + Why this */}
          <Panel>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionTitle sx={{ mb: 0 }}>Score breakdown</SectionTitle>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }} className="bw-numeric">
                <Typography sx={{ fontSize: '1.4rem', fontWeight: 680, color: scoreColor(winnerScore.overall) }}>
                  {winnerScore.overall}
                </Typography>
                <Typography variant="caption">/100</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2.5 }}>
              {breakdown.map((b, i) => (
                <ScoreBar key={b.dimension} label={b.label} score={b.score} weight={b.weight} delay={i * 0.06} />
              ))}
            </Box>

            <Button
              onClick={() => setShowWhy((v) => !v)}
              endIcon={<ChevronDown size={16} style={{ transform: showWhy ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />}
              sx={{ mt: 2, ml: -1, color: palette.brand }}
            >
              Why did BuyWise recommend this?
            </Button>
            <Collapse in={showWhy}>
              <WhyThis result={result} product={product} />
            </Collapse>
          </Panel>

          {/* Alternatives */}
          <Box>
            <SectionTitle>Best alternatives</SectionTitle>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 2 }}>
              {([
                ['Best value', alternatives.bestValue],
                ['Best performance', alternatives.bestPerformance],
                ['Best battery', alternatives.bestBattery],
                ['Cheapest acceptable', alternatives.cheapest],
              ] as const)
                .filter(([, pid]) => pid && pid !== winnerId)
                .map(([label, pid]) => {
                  const p = byId.get(pid!);
                  const s = (whatIf?.scores ?? result.scores).find((x) => x.productId === pid);
                  if (!p) return null;
                  return <AlternativeCard key={label} label={label} product={p} score={s?.overall ?? 0} currency={result.requirements.budget.currency} onCompare={() => { addToCompare(p.id); setToast('Added to compare'); }} />;
                })}
            </Box>
          </Box>

          {/* Don't buy */}
          {dontBuy.length > 0 && (
            <Panel sx={{ borderColor: palette.negativeSoft, background: '#FDFaf9' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Ban size={18} color={palette.negative} />
                <SectionTitle sx={{ mb: 0 }}>Products we wouldn't recommend</SectionTitle>
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Not every candidate deserves your money. Here's what to skip, and why.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                {dontBuy.map((d) => {
                  const p = byId.get(d.productId);
                  if (!p) return null;
                  return (
                    <Box key={d.productId} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', p: 1.5, borderRadius: radius.md, background: palette.surface, border: `1px solid ${palette.hairline}` }}>
                      <ProductThumb src={p.imageUrl} name={p.canonicalName} brand={p.brand} size={48} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 580, fontSize: '0.95rem' }}>{p.canonicalName}</Typography>
                          <SignalPill signal="negative">{DONT_BUY_LABEL[d.reason]}</SignalPill>
                        </Box>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {d.explanation}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Panel>
          )}
        </Box>

        {/* Side column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, position: { lg: 'sticky' }, top: { lg: 88 } }}>
          <WhatIfPanel result={result} onCompute={handleCompute} />
          <Box>
            <SectionTitle>Price intelligence</SectionTitle>
            <Box sx={{ mt: 2 }}>
              <PriceIntel price={product.price} />
            </Box>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={!!toast}
        autoHideDuration={2600}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: radius.md }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* ── sub-components ── */
function Panel({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Box sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: radius.lg, background: palette.surface, border: `1px solid ${palette.hairline}`, overflow: 'hidden', ...sx }}>
      {children}
    </Box>
  );
}

function SectionTitle({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Typography variant="h4" sx={{ fontWeight: 620, mb: 0.5, ...sx }}>
      {children}
    </Typography>
  );
}

function AlternativeCard({
  label,
  product,
  score,
  currency,
  onCompare,
}: {
  label: string;
  product: CanonicalProduct;
  score: number;
  currency: 'INR' | 'USD' | 'EUR';
  onCompare: () => void;
}) {
  const price = bestOfferPrice(product);
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: radius.lg,
        background: palette.surface,
        border: `1px solid ${palette.hairline}`,
        transition: 'transform .2s, box-shadow .2s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: shadow.sm },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="overline" sx={{ color: palette.brand }}>
          {label}
        </Typography>
        <Typography className="bw-numeric" sx={{ fontWeight: 680, color: scoreColor(score) }}>
          {score}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, mt: 1, alignItems: 'center' }}>
        <ProductThumb src={product.imageUrl} name={product.canonicalName} brand={product.brand} size={44} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 560, fontSize: '0.9rem', lineHeight: 1.3 }} noWrap>
            {product.canonicalName}
          </Typography>
          <Typography className="bw-numeric" variant="body2" sx={{ fontWeight: 600 }}>
            {formatPrice(price, currency)}
          </Typography>
        </Box>
      </Box>
      <Button size="small" startIcon={<GitCompareArrows size={14} />} onClick={onCompare} sx={{ mt: 1, ml: -0.5, color: palette.inkSecondary }}>
        Add to compare
      </Button>
    </Box>
  );
}

function WhyThis({ result, product }: { result: ResearchResult; product: CanonicalProduct }) {
  const queried = result.sources.filter((s) => s.status === 'queried');
  return (
    <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${palette.hairline}`, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <EvidenceRow title="Your requirements">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {result.requirements.budget.max && <SignalPill>Budget ≤ {formatPrice(result.requirements.budget.max, result.requirements.budget.currency)}</SignalPill>}
          {result.requirements.useCases.map((u) => (
            <SignalPill key={u}>{u}</SignalPill>
          ))}
          {result.requirements.mustHave.map((m) => (
            <SignalPill key={m} signal="brand">Must have: {m}</SignalPill>
          ))}
        </Box>
      </EvidenceRow>
      <EvidenceRow title="Relevant specifications">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.75 }}>
          {Object.entries(product.specs).slice(0, 8).map(([k, v]) => (
            <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="caption" sx={{ color: palette.inkTertiary, textTransform: 'capitalize' }}>
                {k}
              </Typography>
              <Typography variant="caption" sx={{ color: palette.ink, fontWeight: 500, textAlign: 'right' }}>
                {String(v)}
              </Typography>
            </Box>
          ))}
        </Box>
      </EvidenceRow>
      {product.reviews && (
        <EvidenceRow title={`Reviews — ${product.reviews.averageRating.toFixed(1)}★ across ${product.reviews.totalCount} ratings`}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {product.reviews.pros.slice(0, 3).map((p) => (
              <SignalPill key={p} signal="positive">
                {p}
              </SignalPill>
            ))}
            {product.reviews.cons.slice(0, 2).map((c) => (
              <SignalPill key={c} signal="caution">
                {c}
              </SignalPill>
            ))}
          </Box>
        </EvidenceRow>
      )}
      <EvidenceRow title="Sources used">
        <Typography variant="body2">
          {queried.map((s) => s.name).join(', ')} — {queried.reduce((a, s) => a + s.productCount, 0)} listings normalized.
          We only list sources we actually queried.
        </Typography>
      </EvidenceRow>
    </Box>
  );
}

function EvidenceRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function ResultSkeleton() {
  return (
    <Box>
      <Skeleton variant="rectangular" width={160} height={28} sx={{ mb: 3 }} />
      <Skeleton variant="rectangular" height={220} sx={{ mb: 3 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.55fr 1fr' }, gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Skeleton variant="rectangular" height={180} />
          <Skeleton variant="rectangular" height={260} />
        </Box>
        <Skeleton variant="rectangular" height={400} />
      </Box>
    </Box>
  );
}
