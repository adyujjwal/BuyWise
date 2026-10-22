import { Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { BuyWiseMark } from '@/brand/Logo';
import { keyframes } from '@mui/system';

const pulse = keyframes`
  0%, 100% { opacity: 0.35; transform: scale(0.96); }
  50% { opacity: 1; transform: scale(1); }
`;

const Pulse = styled('div')({
  animation: `${pulse} 1.4s ease-in-out infinite`,
});

/** Branded, calm loading indicator — no generic Material spinner. */
export function BrandSpinner({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <Pulse>
        <BuyWiseMark size={40} />
      </Pulse>
      {label && (
        <Typography variant="caption" sx={{ letterSpacing: '0.02em' }}>
          {label}
        </Typography>
      )}
    </div>
  );
}
