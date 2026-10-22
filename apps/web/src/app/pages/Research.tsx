import { useState, useMemo, useCallback, useEffect } from 'react';
import { Box, Typography, Button, InputBase, Chip } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Sparkle } from 'lucide-react';
import { detectCategory, CATEGORY_LABELS, type ResearchResult } from '@buywise/shared';
import { api, ApiError } from '@/lib/api';
import { palette, radius, shadow } from '@/theme/tokens';
import { ResearchProgress } from '@/app/components/ResearchProgress';
import { ErrorState } from '@/components/States';

const EXAMPLES = [
  'A laptop for Java development, Docker, Kubernetes and gaming under ₹1.2L. I travel a lot.',
  'Best phone under ₹60K with a great camera and all-day battery',
  'Best TV for PS5 under ₹1L',
  'A compact camera for travel photography',
  'Noise cancelling headphones for long flights',
];

const SHORT_EXAMPLES = ['Laptop for developers', 'Best phone under ₹60K', 'Best TV for PS5', 'Camera for travel', 'Headphones for flights'];

export default function Research() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();

  // Prefill from a Home-screen example.
  useEffect(() => {
    const prefill = (location.state as { prefill?: string } | null)?.prefill;
    if (prefill) setQuery(prefill);
  }, [location.state]);

  const mutation = useMutation({
    mutationFn: (q: string) => api.startResearch(q),
    onSuccess: (result: ResearchResult) => {
      queryClient.setQueryData(['research', result.sessionId], result);
    },
  });

  const detected = useMemo(() => (query.trim().length > 8 ? detectCategory(query) : null), [query]);

  const submit = useCallback(() => {
    const q = query.trim();
    if (q.length < 4 || mutation.isPending) return;
    mutation.mutate(q);
  }, [query, mutation]);

  const handleComplete = useCallback(() => {
    const result = mutation.data;
    if (result) navigate(`/app/research/${result.sessionId}`);
  }, [mutation.data, navigate]);

  // ── Live research in progress / completing ──
  if (mutation.isPending || mutation.isSuccess) {
    return (
      <ResearchProgress
        query={query.trim()}
        done={mutation.isSuccess}
        result={mutation.data}
        onComplete={handleComplete}
      />
    );
  }

  // ── Error ──
  if (mutation.isError) {
    const err = mutation.error as ApiError;
    return (
      <ErrorState
        isNetwork={err?.status === 0}
        title="We couldn’t finish that research"
        description={err?.message ?? 'The research didn’t complete. Try again, or tweak your request.'}
        onRetry={() => mutation.reset()}
      />
    );
  }

  // ── Intent input ──
  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', pt: { xs: 2, md: 6 } }}>
      <Box
        component={motion.div}
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="overline" sx={{ color: palette.brand }}>
          New research
        </Typography>
        <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: '1.9rem', md: '2.5rem' } }}>
          What are you looking to buy?
        </Typography>
        <Typography variant="body1" sx={{ mt: 1.5, color: palette.inkSecondary }}>
          Describe it the way you’d explain it to a knowledgeable friend — budget, how you’ll use it, and what
          actually matters to you.
        </Typography>
      </Box>

      <Box
        component={motion.div}
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
        sx={{
          mt: 4,
          p: 1,
          borderRadius: radius.lg,
          background: palette.surface,
          border: `1px solid ${palette.hairlineStrong}`,
          boxShadow: shadow.sm,
          transition: 'border-color .2s, box-shadow .2s',
          '&:focus-within': { borderColor: palette.brand, boxShadow: shadow.focus },
        }}
      >
        <InputBase
          multiline
          minRows={2}
          maxRows={6}
          fullWidth
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="e.g. I need a laptop for Java development, Docker, Kubernetes and gaming under ₹1.2L. I travel frequently, so weight and battery matter."
          sx={{ px: 2, py: 1.5, fontSize: '1.05rem', lineHeight: 1.55 }}
          inputProps={{ 'aria-label': 'Describe what you want to buy' }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, pb: 1, pt: 0.5 }}>
          <Box sx={{ minHeight: 28 }}>
            <AnimatePresence>
              {detected && (
                <Box
                  component={motion.div}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                >
                  <Sparkle size={14} color={palette.brand} />
                  <Typography variant="caption" sx={{ color: palette.inkSecondary }}>
                    Detected category: <b style={{ color: palette.ink }}>{CATEGORY_LABELS[detected]}</b>
                  </Typography>
                </Box>
              )}
            </AnimatePresence>
          </Box>
          <Button
            variant="contained"
            onClick={submit}
            disabled={query.trim().length < 4}
            endIcon={<ArrowRight size={17} />}
          >
            Research
          </Button>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ display: 'block', mt: 1, ml: 1, color: palette.inkTertiary }}>
        Press ⌘/Ctrl + Enter to start
      </Typography>

      <Box sx={{ mt: 5 }}>
        <Typography variant="overline" sx={{ display: 'block', mb: 1.5 }}>
          Or start from an example
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {SHORT_EXAMPLES.map((label, i) => (
            <Chip
              key={label}
              label={label}
              variant="outlined"
              onClick={() => setQuery(EXAMPLES[i] ?? label)}
              sx={{ cursor: 'pointer', '&:hover': { borderColor: palette.brand, background: palette.brandSoft } }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
