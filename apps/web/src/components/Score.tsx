import { Box, Typography } from '@mui/material';
import { motion, useReducedMotion, useMotionValue, animate } from 'framer-motion';
import { useEffect, useState } from 'react';
import { scoreColor, palette } from '@/theme/tokens';

interface ScoreRingProps {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
  showOutOf?: boolean;
  tone?: 'light' | 'dark';
}

/** The BuyWise score — an animated confidence ring with a counting numeral. */
export function ScoreRing({ score, size = 132, stroke = 9, label = 'BuyWise score', showOutOf = true, tone = 'light' }: ScoreRingProps) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const color = scoreColor(score);
  const track = tone === 'dark' ? 'rgba(255,255,255,0.12)' : palette.paperSunken;
  const [display, setDisplay] = useState(reduce ? score : 0);
  const mv = useMotionValue(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(score);
      return;
    }
    const controls = animate(mv, score, {
      duration: 1.1,
      ease: [0.22, 0.61, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [score, reduce, mv]);

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: reduce ? circ * (1 - score / 100) : circ }}
          animate={{ strokeDashoffset: circ * (1 - score / 100) }}
          transition={{ duration: 1.1, ease: [0.22, 0.61, 0.36, 1] }}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline' }} className="bw-numeric">
          <Typography sx={{ fontSize: size * 0.3, fontWeight: 680, lineHeight: 1, color: tone === 'dark' ? '#fff' : palette.ink, letterSpacing: '-0.03em' }}>
            {display}
          </Typography>
          {showOutOf && (
            <Typography sx={{ fontSize: size * 0.12, fontWeight: 500, color: tone === 'dark' ? palette.onNightSecondary : palette.inkTertiary, ml: 0.3 }}>
              /100
            </Typography>
          )}
        </Box>
        {label && (
          <Typography sx={{ fontSize: size * 0.075, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: tone === 'dark' ? palette.onNightSecondary : palette.inkTertiary, mt: 0.4 }}>
            {label}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

interface ScoreBarProps {
  label: string;
  score: number;
  weight?: number;
  delay?: number;
}

/** A single dimension bar in the score breakdown. */
export function ScoreBar({ label, score, weight, delay = 0 }: ScoreBarProps) {
  const reduce = useReducedMotion();
  const color = scoreColor(score);
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: palette.ink, fontWeight: 500 }}>
            {label}
          </Typography>
          {weight !== undefined && (
            <Typography variant="caption" sx={{ color: palette.inkTertiary }}>
              {Math.round(weight * 100)}% weight
            </Typography>
          )}
        </Box>
        <Typography className="bw-numeric" sx={{ fontWeight: 640, fontSize: '0.95rem', color }}>
          {score}
        </Typography>
      </Box>
      <Box sx={{ height: 7, borderRadius: 0, background: palette.paperSunken, overflow: 'hidden' }}>
        <Box
          component={motion.div}
          initial={{ width: reduce ? `${score}%` : 0 }}
          whileInView={{ width: `${score}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1], delay }}
          sx={{ height: '100%', background: color, borderRadius: 0 }}
        />
      </Box>
    </Box>
  );
}
