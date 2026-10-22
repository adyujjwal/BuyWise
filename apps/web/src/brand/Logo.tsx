import { palette } from '@/theme/tokens';

export type LogoTone = 'color' | 'mono' | 'onDark';

interface MarkProps {
  size?: number;
  tone?: LogoTone;
  title?: string;
}

/**
 * BuyWise icon mark.
 * An ascending decision check that breaks past its frame (discovery / upside),
 * terminating in a "chosen" node. Reads as confidence + value + a smart pick.
 * Deliberately not a brain, sparkle, or generic AI glyph.
 */
export function BuyWiseMark({ size = 32, tone = 'color', title = 'BuyWise' }: MarkProps) {
  const tile = tone === 'onDark' ? 'rgba(255,255,255,0.06)' : tone === 'mono' ? 'currentColor' : palette.ink;
  const tileOpacity = tone === 'mono' ? 0.08 : 1;
  const stroke = tone === 'color' ? palette.brandBright : tone === 'onDark' ? '#fff' : 'currentColor';
  const node = tone === 'color' ? palette.brandBright : stroke;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      role="img"
      aria-label={title}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <title>{title}</title>
      {/* Frame tile */}
      <rect x="2" y="2" width="27" height="27" rx="8.5" fill={tile} fillOpacity={tileOpacity} />
      <rect
        x="2.5"
        y="2.5"
        width="26"
        height="26"
        rx="8"
        stroke={tone === 'color' ? 'rgba(255,255,255,0.08)' : 'transparent'}
      />
      {/* Ascending decision check — rising arm extends beyond the frame */}
      <path
        d="M8.5 16.8 L14.2 22.6 L31 6.2"
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Chosen node */}
      <circle cx="31" cy="6.2" r="3.1" fill={node} />
      <circle cx="31" cy="6.2" r="3.1" stroke={tone === 'onDark' ? palette.night : palette.ink} strokeOpacity={tone === 'color' ? 0.15 : 0} strokeWidth="1" />
    </svg>
  );
}

interface LogoProps extends MarkProps {
  variant?: 'full' | 'icon';
  /** wordmark font size in px (full variant only) */
  wordSize?: number;
}

export function Logo({ variant = 'full', size = 30, wordSize = 20, tone = 'color', title = 'BuyWise' }: LogoProps) {
  if (variant === 'icon') return <BuyWiseMark size={size} tone={tone} title={title} />;
  const wordColor = tone === 'onDark' ? palette.onNight : palette.ink;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8.8px' }}>
      <BuyWiseMark size={size} tone={tone} title={title} />
      <span
        style={{
          fontSize: `${wordSize}px`,
          fontWeight: 680,
          letterSpacing: '-0.028em',
          color: wordColor,
          lineHeight: 1,
        }}
      >
        Buy
        <span style={{ color: tone === 'color' ? palette.brand : 'inherit', fontWeight: 680 }}>
          Wise
        </span>
      </span>
    </span>
  );
}
