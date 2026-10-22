import { useMemo, useState, useEffect } from 'react';
import { Box, Typography, Slider, Button } from '@mui/material';
import { RotateCcw } from 'lucide-react';
import { CATEGORY_DIMENSIONS, bestOfferPrice, type ResearchResult, type Priority } from '@buywise/shared';
import { recomputeWhatIf, type WhatIfComputed } from '@/lib/recommend';
import { formatPriceShort } from '@/lib/format';
import { palette, radius } from '@/theme/tokens';

export function WhatIfPanel({
  result,
  onCompute,
}: {
  result: ResearchResult;
  onCompute: (computed: WhatIfComputed | null) => void;
}) {
  const category = result.requirements.category;
  const dims = CATEGORY_DIMENSIONS[category];

  const priceRange = useMemo(() => {
    const prices = result.products.map((p) => bestOfferPrice(p) ?? 0).filter(Boolean);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const base = result.requirements.budget.max ?? max;
    return { min: Math.floor(min * 0.9), max: Math.ceil(Math.max(max, base) * 1.15), base };
  }, [result]);

  const initialImportances = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of dims) map[d.key] = 0.5;
    for (const p of result.requirements.priorities) map[p.dimension] = p.importance;
    return map;
  }, [dims, result.requirements.priorities]);

  const [budgetMax, setBudgetMax] = useState<number>(priceRange.base);
  const [importances, setImportances] = useState<Record<string, number>>(initialImportances);
  const [touched, setTouched] = useState(false);

  const priorities: Priority[] = useMemo(
    () => Object.entries(importances).map(([dimension, importance]) => ({ dimension, importance })),
    [importances],
  );

  useEffect(() => {
    if (!touched) {
      onCompute(null);
      return;
    }
    onCompute(recomputeWhatIf(result, { budgetMax, priorities }));
  }, [budgetMax, priorities, touched, result, onCompute]);

  const reset = () => {
    setBudgetMax(priceRange.base);
    setImportances(initialImportances);
    setTouched(false);
  };

  // Show the most meaningful sliders first (highest default weight).
  const sliderDims = [...dims].sort((a, b) => b.defaultWeight - a.defaultWeight).slice(0, 5);

  return (
    <Box sx={{ p: { xs: 2.5, md: 3 }, borderRadius: radius.lg, background: palette.surfaceWarm, border: `1px solid ${palette.hairline}` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h4">What if…</Typography>
          <Typography variant="body2" sx={{ mt: 0.25 }}>
            Move a slider — the ranking recomputes instantly.
          </Typography>
        </Box>
        {touched && (
          <Button size="small" startIcon={<RotateCcw size={15} />} onClick={reset} sx={{ color: palette.inkSecondary }}>
            Reset
          </Button>
        )}
      </Box>

      {/* Budget */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 560, color: palette.ink }}>
            Budget ceiling
          </Typography>
          <Typography className="bw-numeric" variant="body2" sx={{ fontWeight: 640, color: palette.brand }}>
            {formatPriceShort(budgetMax, result.requirements.budget.currency)}
          </Typography>
        </Box>
        <Slider
          value={budgetMax}
          min={priceRange.min}
          max={priceRange.max}
          step={1000}
          onChange={(_, v) => {
            setBudgetMax(v as number);
            setTouched(true);
          }}
          sx={{ color: palette.brand }}
          aria-label="Budget ceiling"
        />
      </Box>

      {/* Priority sliders */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {sliderDims.map((d) => (
          <Box key={d.key}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 560, color: palette.ink }}>
                {d.label}
              </Typography>
              <Typography variant="caption" sx={{ color: palette.inkTertiary }}>
                {importanceLabel(importances[d.key] ?? 0.5)}
              </Typography>
            </Box>
            <Slider
              value={importances[d.key] ?? 0.5}
              min={0}
              max={1}
              step={0.05}
              onChange={(_, v) => {
                setImportances((prev) => ({ ...prev, [d.key]: v as number }));
                setTouched(true);
              }}
              sx={{ color: palette.ink }}
              aria-label={`${d.label} importance`}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function importanceLabel(v: number): string {
  if (v >= 0.8) return 'Critical';
  if (v >= 0.6) return 'Important';
  if (v >= 0.4) return 'Neutral';
  if (v >= 0.2) return 'Minor';
  return 'Not important';
}
