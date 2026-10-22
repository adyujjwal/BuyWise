import { Box, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { BuyWiseMark } from '@/brand/Logo';
import { palette } from '@/theme/tokens';

export default function NotFound() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3, background: palette.paper }}>
      <Box sx={{ textAlign: 'center', maxWidth: 420 }}>
        <BuyWiseMark size={48} />
        <Typography className="bw-numeric" sx={{ fontSize: '4rem', fontWeight: 680, letterSpacing: '-0.03em', mt: 2, lineHeight: 1 }}>
          404
        </Typography>
        <Typography variant="h4" sx={{ mt: 1 }}>
          This page took a wrong turn.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1.5 }}>
          The page you’re after doesn’t exist or has moved. Let’s get you back to a decision.
        </Typography>
        <Box sx={{ mt: 4, display: 'flex', gap: 1.5, justifyContent: 'center' }}>
          <Button component={RouterLink} to="/" variant="outlined">
            Home
          </Button>
          <Button component={RouterLink} to="/app/research" variant="contained">
            Start researching
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
