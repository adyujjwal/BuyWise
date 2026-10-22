import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import type { ResearchResult } from '@buywise/shared';
import { palette, radius } from '@/theme/tokens';
import { BuyWiseMark } from '@/brand/Logo';

interface Stage {
  key: string;
  title: string;
  items: string[];
}

const STAGES: Stage[] = [
  { key: 'understand', title: 'Understanding your requirements', items: ['Budget identified', 'Use cases identified', 'Priorities mapped', 'Constraints noted'] },
  { key: 'research', title: 'Researching products', items: ['Retailer sources', 'Manufacturer specifications', 'Reviews', 'Price information'] },
  { key: 'compare', title: 'Comparing specifications', items: ['Normalizing across sources', 'Resolving duplicate listings'] },
  { key: 'score', title: 'Scoring against your priorities', items: ['Applying your weights', 'Checking budget fit'] },
  { key: 'recommend', title: 'Preparing your recommendation', items: ['Selecting the best match', 'Explaining the trade-offs'] },
];

/**
 * The live research experience. It stages BuyWise's real pipeline (extract →
 * research → normalize → score → recommend). It never streams hidden reasoning —
 * only concise status, and the actual source statuses once the result lands.
 */
export function ResearchProgress({
  query,
  done,
  result,
  onComplete,
}: {
  query: string;
  done: boolean;
  result?: ResearchResult;
  onComplete: () => void;
}) {
  const reduce = useReducedMotion();
  const [stageIndex, setStageIndex] = useState(0);

  // Advance through stages on a cadence; hold on the last stage until the
  // request resolves, then complete shortly after for a settled feel.
  useEffect(() => {
    if (stageIndex >= STAGES.length - 1) return;
    const atPenultimateWaiting = stageIndex === STAGES.length - 2 && !done;
    if (atPenultimateWaiting) return;
    const t = setTimeout(() => setStageIndex((i) => Math.min(i + 1, STAGES.length - 1)), reduce ? 220 : 820);
    return () => clearTimeout(t);
  }, [stageIndex, done, reduce]);

  useEffect(() => {
    if (done) {
      setStageIndex(STAGES.length - 1);
      const t = setTimeout(onComplete, reduce ? 150 : 700);
      return () => clearTimeout(t);
    }
  }, [done, onComplete, reduce]);

  return (
    <Box sx={{ maxWidth: 620, mx: 'auto', py: { xs: 2, md: 5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box
          component={motion.div}
          animate={reduce ? {} : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        >
          <BuyWiseMark size={30} />
        </Box>
        <Typography variant="overline">BuyWise is researching</Typography>
      </Box>
      <Typography variant="h4" sx={{ mb: 4, color: palette.ink }}>
        “{query}”
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {STAGES.map((stage, i) => {
          const state: 'done' | 'active' | 'pending' =
            i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'pending';
          return <StageRow key={stage.key} stage={stage} state={state} result={result} reduce={!!reduce} />;
        })}
      </Box>
    </Box>
  );
}

function StageRow({
  stage,
  state,
  result,
  reduce,
}: {
  stage: Stage;
  state: 'done' | 'active' | 'pending';
  result?: ResearchResult;
  reduce: boolean;
}) {
  // For the research stage, surface the real source statuses once available.
  const items =
    stage.key === 'research' && result
      ? result.sources.map((s) => `${s.name} — ${s.status === 'queried' ? `${s.productCount} products` : s.status}`)
      : stage.items;

  return (
    <Box
      component={motion.div}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: state === 'pending' ? 0.4 : 1, y: 0 }}
      transition={{ duration: 0.3 }}
      sx={{
        p: 2,
        borderRadius: radius.md,
        border: `1px solid ${state === 'active' ? palette.brandSoftBorder : palette.hairline}`,
        background: state === 'active' ? palette.brandSoft : palette.surface,
        transition: 'background .3s, border-color .3s',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <StatusIcon state={state} reduce={reduce} />
        <Typography sx={{ fontWeight: 560, fontSize: '0.95rem', color: palette.ink }}>{stage.title}</Typography>
      </Box>
      <AnimatePresence>
        {state !== 'pending' && (
          <Box
            component={motion.div}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            sx={{ overflow: 'hidden', pl: 3.5, mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}
          >
            {items.map((item) => (
              <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Check size={13} color={palette.brand} />
                <Typography variant="caption" sx={{ color: palette.inkSecondary }}>
                  {item}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </AnimatePresence>
    </Box>
  );
}

function StatusIcon({ state, reduce }: { state: 'done' | 'active' | 'pending'; reduce: boolean }) {
  if (state === 'done') {
    return (
      <Box sx={{ width: 22, height: 22, borderRadius: '50%', background: palette.brand, display: 'grid', placeItems: 'center' }}>
        <Check size={13} color="#fff" />
      </Box>
    );
  }
  if (state === 'active') {
    return (
      <Box
        component={motion.div}
        animate={reduce ? {} : { rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
        sx={{ width: 22, height: 22, display: 'grid', placeItems: 'center', color: palette.brandPressed }}
      >
        <Loader2 size={16} />
      </Box>
    );
  }
  return <Box sx={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${palette.hairlineStrong}` }} />;
}
