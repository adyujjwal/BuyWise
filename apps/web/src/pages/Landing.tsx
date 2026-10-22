import { Box, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  ArrowRight,
  ScanSearch,
  GitCompareArrows,
  BadgeCheck,
  Layers,
  TrendingDown,
  SlidersHorizontal,
  ShieldCheck,
  CircleDollarSign,
  Quote,
} from 'lucide-react';
import { MarketingNav } from '@/components/MarketingNav';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { Eyebrow, Container, SignalPill } from '@/components/primitives';
import { ScoreRing, ScoreBar } from '@/components/Score';
import { Hero3D } from '@/three/Hero3D';
import { palette, radius, shadow } from '@/theme/tokens';

/* ─────────────────────────── Hero ─────────────────────────── */
function Hero() {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        pt: { xs: 13, md: 16 },
        pb: { xs: 6, md: 10 },
        background: `linear-gradient(180deg, ${palette.paper} 0%, ${palette.paper} 70%, ${palette.paperSunken} 100%)`,
      }}
    >
      <Container>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
            gap: { xs: 4, md: 5 },
            alignItems: 'center',
          }}
        >
          {/* Copy */}
          <Box sx={{ maxWidth: 560 }}>
            <Reveal>
              <SignalPill signal="brand">
                <ShieldCheck size={13} /> Evidence-based recommendations
              </SignalPill>
            </Reveal>
            <Reveal delay={0.05}>
              <Typography
                variant="h1"
                sx={{
                  mt: 2.5,
                  fontSize: { xs: '2.6rem', sm: '3.2rem', md: '3.7rem' },
                  fontWeight: 680,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.02,
                }}
              >
                Research less.
                <br />
                <Box component="span" sx={{ color: palette.brand }}>
                  Buy smarter.
                </Box>
              </Typography>
            </Reveal>
            <Reveal delay={0.12}>
              <Typography variant="subtitle1" sx={{ mt: 3, color: palette.inkSecondary, maxWidth: 460 }}>
                BuyWise researches products, prices, reviews and trade-offs so you can make confident buying
                decisions — not just find a list of products.
              </Typography>
            </Reveal>
            <Reveal delay={0.18}>
              <Box sx={{ mt: 4, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  component={RouterLink}
                  to="/app"
                  size="large"
                  variant="contained"
                  endIcon={<ArrowRight size={18} />}
                >
                  Start researching
                </Button>
                <Button component="a" href="#how" size="large" variant="outlined">
                  See how it works
                </Button>
              </Box>
            </Reveal>
            <Reveal delay={0.24}>
              <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
                {['Multi-source', 'Deterministic scoring', 'Explainable'].map((t) => (
                  <Box key={t} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <BadgeCheck size={15} color={palette.brand} />
                    <Typography variant="caption" sx={{ color: palette.inkSecondary, fontWeight: 500 }}>
                      {t}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Reveal>
          </Box>

          {/* 3D stage */}
          <Box
            sx={{
              position: 'relative',
              height: { xs: 320, sm: 400, md: 520 },
              borderRadius: radius.xl,
              overflow: 'hidden',
              background: `radial-gradient(130% 130% at 70% 15%, ${palette.nightRaised}, ${palette.night})`,
              boxShadow: shadow.lg,
              border: `1px solid ${palette.nightHairline}`,
            }}
          >
            <Hero3D />
            {/* floating evidence chip overlay — reinforces the concept */}
            <Box sx={{ position: 'absolute', left: 20, bottom: 20, display: 'flex', gap: 1, flexWrap: 'wrap', pr: 2 }}>
              <SignalPill signal="brand">Best match · 91</SignalPill>
              <SignalPill signal="caution">Price: wait</SignalPill>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

/* ─────────────────────── Problem statement ─────────────────────── */
function Problem() {
  return (
    <Box component="section" sx={{ py: { xs: 7, md: 11 }, background: palette.paperSunken }}>
      <Container>
        <Reveal>
          <Typography
            variant="h2"
            sx={{ maxWidth: 760, fontWeight: 640, fontSize: { xs: '1.7rem', md: '2.35rem' } }}
          >
            Stop comparing tabs. Start making decisions.
          </Typography>
        </Reveal>
        <Reveal delay={0.06}>
          <Typography variant="body1" sx={{ mt: 2.5, maxWidth: 640, color: palette.inkSecondary }}>
            Buying something good means reading a dozen reviews, cross-checking specs you half understand, and
            guessing whether today’s price is fair. BuyWise turns that work into a single, explainable decision.
          </Typography>
        </Reveal>
        <Box
          sx={{
            mt: 5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2.5,
          }}
        >
          {[
            { k: '18', l: 'tabs for one laptop', s: 'the average research rabbit hole' },
            { k: '5', l: 'sources, normalized', s: 'retailers + manufacturer specs + reviews' },
            { k: '1', l: 'decision, explained', s: 'with the trade-offs made explicit' },
          ].map((stat, i) => (
            <Reveal key={stat.l} delay={i * 0.07}>
              <Box
                sx={{
                  p: 3,
                  borderRadius: radius.lg,
                  background: palette.surface,
                  border: `1px solid ${palette.hairline}`,
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                <Typography className="bw-numeric" sx={{ fontSize: '2.6rem', fontWeight: 680, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {stat.k}
                </Typography>
                <Typography sx={{ mt: 1, fontWeight: 580 }}>{stat.l}</Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  {stat.s}
                </Typography>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ─────────────────────── How it works ─────────────────────── */
const STEPS = [
  { icon: ScanSearch, title: 'Intent', body: 'Describe what you want in plain language. BuyWise extracts your budget, use-cases and what you actually prioritize.' },
  { icon: Layers, title: 'Research', body: 'It queries multiple retailers, manufacturer specs and reviews — then normalizes and de-duplicates the same product across sources.' },
  { icon: GitCompareArrows, title: 'Compare', body: 'A deterministic engine scores every candidate against your priorities. No vibes, no mystery numbers.' },
  { icon: BadgeCheck, title: 'Decide', body: 'You get one recommendation, the honest trade-offs, strong alternatives — and what not to buy, with reasons.' },
];

function HowItWorks() {
  return (
    <Box id="how" component="section" sx={{ py: { xs: 8, md: 13 } }}>
      <Container>
        <Reveal>
          <Eyebrow>How it works</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <Typography variant="h2" sx={{ maxWidth: 620 }}>
            Intent, research, compare, decide — in one pass.
          </Typography>
        </Reveal>
        <Box
          sx={{
            mt: 6,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2.5,
          }}
        >
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08}>
              <Box
                sx={{
                  p: 3,
                  height: '100%',
                  borderRadius: radius.lg,
                  background: palette.surfaceWarm,
                  border: `1px solid ${palette.hairline}`,
                  overflow: 'hidden',
                  transition: 'transform .25s, box-shadow .25s',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: shadow.md },
                }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: radius.md,
                    display: 'grid',
                    placeItems: 'center',
                    background: palette.brandSoft,
                    color: palette.brandPressed,
                  }}
                >
                  <step.icon size={21} />
                </Box>
                <Typography variant="overline" sx={{ display: 'block', mt: 2.5, color: palette.inkTertiary }}>
                  Step {i + 1}
                </Typography>
                <Typography variant="h4" sx={{ mt: 0.5 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {step.body}
                </Typography>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ──────────────── Multi-source research visualization ──────────────── */
const SOURCES = [
  { name: 'Amazon', count: 6, status: 'queried' as const },
  { name: 'Flipkart', count: 5, status: 'queried' as const },
  { name: 'Croma', count: 4, status: 'queried' as const },
  { name: 'Reliance Digital', count: 3, status: 'queried' as const },
  { name: 'Manufacturer specs', count: 8, status: 'queried' as const },
];

function MultiSource() {
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 13 }, background: palette.night, color: palette.onNight }}>
      <Container>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.1fr' }, gap: { xs: 4, md: 7 }, alignItems: 'center' }}>
          <Box>
            <Reveal>
              <Eyebrow tone="dark">Multi-source research</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <Typography variant="h2" sx={{ color: palette.onNight }}>
                We tell you exactly where we looked.
              </Typography>
            </Reveal>
            <Reveal delay={0.1}>
              <Typography variant="body1" sx={{ mt: 2.5, color: palette.onNightSecondary, maxWidth: 440 }}>
                BuyWise pulls from retailers, manufacturer specifications and reviews through a pluggable source
                architecture — then resolves the same product across every source into one canonical entry.
                If a source wasn’t queried, we never pretend it was.
              </Typography>
            </Reveal>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {SOURCES.map((s, i) => (
              <Reveal key={s.name} delay={i * 0.06}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2.5,
                    py: 1.75,
                    borderRadius: radius.md,
                    background: palette.nightRaised,
                    border: `1px solid ${palette.nightHairline}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: palette.brandBright }} />
                    <Typography sx={{ color: palette.onNight, fontWeight: 540 }}>{s.name}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: palette.onNightSecondary }}>
                    {s.count} products · queried
                  </Typography>
                </Box>
              </Reveal>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

/* ─────────────── Example recommendation + explainability ─────────────── */
function ExampleRecommendation() {
  const reasons = [
    'Handles Docker, Kubernetes and JVM builds comfortably — 14-core CPU with 16GB RAM.',
    'Among the lightest in its performance class at 1.5kg, with ~11h real-world battery.',
    'Priced ₹8K under your ceiling, and currently near its 90-day low.',
  ];
  const tradeoffs = ['GPU is capable but not top-tier for AAA gaming at max settings.', 'Only two USB-C ports.'];
  const breakdown = [
    { label: 'Performance', score: 91, weight: 0.3 },
    { label: 'Value', score: 84, weight: 0.25 },
    { label: 'Portability', score: 89, weight: 0.2 },
    { label: 'Battery', score: 78, weight: 0.15 },
    { label: 'Reviews', score: 86, weight: 0.1 },
  ];

  return (
    <Box id="tradeoffs" component="section" sx={{ py: { xs: 8, md: 13 } }}>
      <Container>
        <Reveal>
          <Eyebrow>The outcome</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <Typography variant="h2" sx={{ maxWidth: 680 }}>
            Not the most popular product. The right one for you.
          </Typography>
        </Reveal>

        <Box
          sx={{
            mt: 6,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
            gap: 3,
            alignItems: 'stretch',
          }}
        >
          {/* Recommendation card */}
          <Reveal>
            <Box
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: radius.xl,
                background: palette.surface,
                border: `1px solid ${palette.hairline}`,
                boxShadow: shadow.md,
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                <ScoreRing score={91} />
                <Box sx={{ flex: 1, minWidth: 180 }}>
                  <SignalPill signal="brand">Your best match</SignalPill>
                  <Typography variant="h3" sx={{ mt: 1.5 }}>
                    Lenovo Legion Slim 5
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1 }} className="bw-numeric">
                    <Typography sx={{ fontSize: '1.6rem', fontWeight: 680, letterSpacing: '-0.02em' }}>
                      ₹1,11,990
                    </Typography>
                    <Typography variant="caption" sx={{ textDecoration: 'line-through', color: palette.inkTertiary }}>
                      ₹1,24,990
                    </Typography>
                    <SignalPill signal="positive">
                      <TrendingDown size={12} /> near 90-day low
                    </SignalPill>
                  </Box>
                </Box>
              </Box>

              <Typography variant="overline" sx={{ display: 'block', mt: 4 }}>
                Why this wins
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 1.5 }}>
                {reasons.map((r) => (
                  <Box key={r} sx={{ display: 'flex', gap: 1.25 }}>
                    <BadgeCheck size={18} color={palette.brand} style={{ flexShrink: 0, marginTop: 2 }} />
                    <Typography variant="body2" sx={{ color: palette.ink }}>
                      {r}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Typography variant="overline" sx={{ display: 'block', mt: 3.5 }}>
                What you give up
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1.5 }}>
                {tradeoffs.map((t) => (
                  <Box key={t} sx={{ display: 'flex', gap: 1.25 }}>
                    <Box sx={{ width: 18, display: 'grid', placeItems: 'center', flexShrink: 0, mt: 0.3 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: palette.caution }} />
                    </Box>
                    <Typography variant="body2">{t}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Reveal>

          {/* Score breakdown */}
          <Reveal delay={0.1}>
            <Box
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: radius.xl,
                background: palette.surfaceWarm,
                border: `1px solid ${palette.hairline}`,
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SlidersHorizontal size={17} color={palette.inkSecondary} />
                <Typography variant="h4">How the score was calculated</Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 1, mb: 3 }}>
                Weights shift with your priorities. You said portability and performance matter most on travel days —
                so they carry the most weight here.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
                {breakdown.map((b, i) => (
                  <ScoreBar key={b.label} label={b.label} score={b.score} weight={b.weight} delay={i * 0.08} />
                ))}
              </Box>
            </Box>
          </Reveal>
        </Box>
      </Container>
    </Box>
  );
}

/* ─────────────────────── Price intelligence ─────────────────────── */
function PriceIntelligence() {
  return (
    <Box id="price" component="section" sx={{ py: { xs: 8, md: 13 }, background: palette.paperSunken }}>
      <Container>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 4, md: 7 }, alignItems: 'center' }}>
          <Box>
            <Reveal>
              <Eyebrow>Price intelligence</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <Typography variant="h2">Buy at the right time, not just the right product.</Typography>
            </Reveal>
            <Reveal delay={0.1}>
              <Typography variant="body1" sx={{ mt: 2.5, color: palette.inkSecondary, maxWidth: 440 }}>
                Where real price history exists, BuyWise shows the 30-day average, the 90-day low and the trend — and
                tells you whether to buy now or wait. Where it doesn’t, it says so, rather than inventing a chart.
              </Typography>
            </Reveal>
          </Box>
          <Reveal delay={0.08}>
            <Box
              sx={{
                p: 4,
                borderRadius: radius.xl,
                background: palette.surface,
                border: `1px solid ${palette.hairline}`,
                boxShadow: shadow.sm,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box className="bw-numeric">
                  <Typography variant="caption">Current price</Typography>
                  <Typography sx={{ fontSize: '2.2rem', fontWeight: 680, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                    ₹89,999
                  </Typography>
                </Box>
                <SignalPill signal="caution">
                  <CircleDollarSign size={13} /> Recommendation: WAIT
                </SignalPill>
              </Box>
              <Box sx={{ display: 'flex', gap: 4, mt: 3 }} className="bw-numeric">
                <Box>
                  <Typography variant="caption">30-day average</Typography>
                  <Typography sx={{ fontWeight: 640, fontSize: '1.1rem' }}>₹84,500</Typography>
                </Box>
                <Box>
                  <Typography variant="caption">90-day low</Typography>
                  <Typography sx={{ fontWeight: 640, fontSize: '1.1rem' }}>₹80,990</Typography>
                </Box>
                <Box>
                  <Typography variant="caption">Trend</Typography>
                  <Typography sx={{ fontWeight: 640, fontSize: '1.1rem', color: palette.positive }}>Falling</Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: radius.md,
                  background: palette.cautionSoft,
                  display: 'flex',
                  gap: 1.25,
                  alignItems: 'flex-start',
                }}
              >
                <TrendingDown size={18} color="#8A6016" style={{ marginTop: 2, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ color: '#6E4D12' }}>
                  It’s ₹5,500 above its 30-day average and trending down. An attractive price is likely around
                  <b> ₹80K–₹83K</b> based on the last 90 days.
                </Typography>
              </Box>
            </Box>
          </Reveal>
        </Box>
      </Container>
    </Box>
  );
}

/* ─────────────────────── Don't buy / personalization ─────────────────────── */
function Principles() {
  const items = [
    {
      icon: ShieldCheck,
      title: 'Explainable by default',
      body: 'Every recommendation traces back to a requirement, a spec, a price point or a review. No chain-of-thought, just evidence.',
    },
    {
      icon: Quote,
      title: 'It tells you what not to buy',
      body: 'Poor value, weak battery, overpriced today, or a missing must-have — the picks you should skip, and exactly why.',
    },
    {
      icon: SlidersHorizontal,
      title: 'Change your mind, instantly',
      body: 'Nudge the budget or shift priorities and watch the ranking recompute live. “ASUS X moved from #4 to #1.”',
    },
  ];
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 13 } }}>
      <Container>
        <Reveal>
          <Typography variant="h2" sx={{ maxWidth: 640 }}>
            Built to be trusted, not just to look clever.
          </Typography>
        </Reveal>
        <Box sx={{ mt: 6, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.08}>
              <Box sx={{ p: 3.5, borderRadius: radius.lg, border: `1px solid ${palette.hairline}`, height: '100%', overflow: 'hidden' }}>
                <it.icon size={22} color={palette.brand} />
                <Typography variant="h4" sx={{ mt: 2 }}>
                  {it.title}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {it.body}
                </Typography>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ─────────────────────── Final CTA ─────────────────────── */
function FinalCTA() {
  return (
    <Box component="section" sx={{ pb: { xs: 8, md: 12 } }}>
      <Container>
        <Reveal>
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: radius.xl,
              px: { xs: 3.5, md: 8 },
              py: { xs: 6, md: 9 },
              background: `radial-gradient(120% 160% at 85% 0%, ${palette.brandPressed} 0%, ${palette.night} 55%)`,
              color: palette.onNight,
            }}
          >
            <Typography variant="h2" sx={{ color: palette.onNight, maxWidth: 540, fontSize: { xs: '2rem', md: '2.6rem' } }}>
              Tell us what matters. We’ll do the research.
            </Typography>
            <Typography sx={{ mt: 2, color: palette.onNightSecondary, maxWidth: 460 }}>
              Run your first research in under a minute — no setup, works end-to-end on seeded demo data.
            </Typography>
            <Box sx={{ mt: 4, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                component={RouterLink}
                to="/app"
                size="large"
                variant="contained"
                sx={{ background: palette.surface, color: palette.ink, '&:hover': { background: '#fff' } }}
                endIcon={<ArrowRight size={18} />}
              >
                Start researching
              </Button>
            </Box>
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
}

export default function Landing() {
  return (
    <Box sx={{ background: palette.paper }}>
      <MarketingNav />
      <Hero />
      <Problem />
      <HowItWorks />
      <MultiSource />
      <ExampleRecommendation />
      <PriceIntelligence />
      <Principles />
      <FinalCTA />
      <Footer />
    </Box>
  );
}
