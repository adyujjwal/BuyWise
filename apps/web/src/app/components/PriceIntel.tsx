import { Box, Typography } from '@mui/material';
import { TrendingDown, TrendingUp, Minus, HelpCircle } from 'lucide-react';
import type { PriceIntelligence } from '@buywise/shared';
import { formatPrice } from '@/lib/format';
import { palette, radius } from '@/theme/tokens';
import { SignalPill } from '@/components/primitives';

function Sparkline({ data, color }: { data: { price: number }[]; color: string }) {
  if (data.length < 2) return null;
  const w = 220;
  const h = 48;
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.price - min) / range) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length - 1]!.split(',');
  return (
    <svg width={w} height={h} style={{ display: 'block', maxWidth: '100%' }} preserveAspectRatio="none" viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.75} fill={color} />
    </svg>
  );
}

const REC_CONFIG = {
  buy: { label: 'BUY NOW', signal: 'positive' as const },
  wait: { label: 'WAIT', signal: 'caution' as const },
  neutral: { label: 'FAIR PRICE', signal: 'neutral' as const },
  'insufficient-data': { label: 'NO DATA', signal: 'neutral' as const },
};

export function PriceIntel({ price }: { price: PriceIntelligence | null }) {
  if (!price) {
    return (
      <Box sx={{ p: 3, borderRadius: radius.lg, border: `1px dashed ${palette.hairlineStrong}`, background: palette.surfaceWarm }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpCircle size={18} color={palette.inkTertiary} />
          <Typography sx={{ fontWeight: 580 }}>Insufficient historical data</Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 1 }}>
          We don’t have reliable price history for this product yet, so we won’t guess. We’ll only call “buy” or
          “wait” when the data supports it.
        </Typography>
      </Box>
    );
  }

  const rec = REC_CONFIG[price.recommendation];
  const TrendIcon = price.trend === 'falling' ? TrendingDown : price.trend === 'rising' ? TrendingUp : Minus;
  const trendColor = price.trend === 'falling' ? palette.positive : price.trend === 'rising' ? palette.negative : palette.inkTertiary;

  return (
    <Box sx={{ p: 3, borderRadius: radius.lg, border: `1px solid ${palette.hairline}`, background: palette.surface }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box className="bw-numeric">
          <Typography variant="caption">Current price</Typography>
          <Typography sx={{ fontSize: '2rem', fontWeight: 680, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            {formatPrice(price.current, price.currency)}
          </Typography>
        </Box>
        <SignalPill signal={rec.signal}>Recommendation: {rec.label}</SignalPill>
      </Box>

      {price.history.length > 1 && (
        <Box sx={{ mt: 2 }}>
          <Sparkline data={price.history} color={trendColor} />
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 3.5, mt: 2, flexWrap: 'wrap' }} className="bw-numeric">
        <Stat label="30-day average" value={price.avg30 ? formatPrice(price.avg30, price.currency) : '—'} />
        <Stat label="90-day low" value={price.low90 ? formatPrice(price.low90, price.currency) : '—'} />
        <Stat
          label="Trend"
          value={
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: trendColor }}>
              <TrendIcon size={16} />
              {price.trend === 'unknown' ? '—' : price.trend[0]!.toUpperCase() + price.trend.slice(1)}
            </Box>
          }
        />
      </Box>

      {price.note && (
        <Typography variant="caption" sx={{ display: 'block', mt: 2, color: palette.inkSecondary }}>
          {price.note}
        </Typography>
      )}
      {price.recommendation === 'wait' && price.expectedRange && (
        <Box sx={{ mt: 2, p: 1.5, borderRadius: radius.sm, background: palette.cautionSoft }}>
          <Typography variant="body2" sx={{ color: '#6E4D12' }}>
            An attractive price is likely around{' '}
            <b>
              {formatPrice(price.expectedRange.low, price.currency)}–{formatPrice(price.expectedRange.high, price.currency)}
            </b>{' '}
            based on recent history.
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption">{label}</Typography>
      <Typography sx={{ fontWeight: 640, fontSize: '1.05rem' }}>{value}</Typography>
    </Box>
  );
}
