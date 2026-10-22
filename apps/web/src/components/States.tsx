import { Box, Typography, Button } from '@mui/material';
import type { ReactNode } from 'react';
import { palette, radius } from '@/theme/tokens';
import { ServerCrash, SearchX, WifiOff, Inbox } from 'lucide-react';

interface StateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  icon?: ReactNode;
}

function BaseState({ title, description, action, secondaryAction, icon }: StateProps) {
  return (
    <Box
      role="status"
      sx={{
        textAlign: 'center',
        py: { xs: 6, md: 8 },
        px: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.25,
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: radius.lg,
            display: 'grid',
            placeItems: 'center',
            background: palette.surfaceWarm,
            border: `1px solid ${palette.hairline}`,
            color: palette.inkTertiary,
            mb: 1,
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="h4" sx={{ fontWeight: 620 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ maxWidth: 420, color: palette.inkSecondary }}>
          {description}
        </Typography>
      )}
      {(action || secondaryAction) && (
        <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {action && (
            <Button variant="contained" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outlined" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}

export function ErrorState({
  title = 'Something went wrong on our side',
  description = 'The request didn’t complete. This is on us, not you — try again in a moment.',
  onRetry,
  isNetwork,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isNetwork?: boolean;
}) {
  return (
    <BaseState
      icon={isNetwork ? <WifiOff size={24} /> : <ServerCrash size={24} />}
      title={isNetwork ? 'You appear to be offline' : title}
      description={isNetwork ? 'We couldn’t reach BuyWise. Check your connection and try again.' : description}
      action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
    />
  );
}

export function EmptyState({ title, description, action, icon }: StateProps) {
  return <BaseState icon={icon ?? <Inbox size={24} />} title={title} description={description} action={action} />;
}

export function NoResultsState({ onReset }: { onReset?: () => void }) {
  return (
    <BaseState
      icon={<SearchX size={24} />}
      title="No products matched tightly enough"
      description="Nothing cleared the bar for your current constraints. Try widening your budget or relaxing a must-have — BuyWise would rather say so than recommend a poor fit."
      action={onReset ? { label: 'Adjust the search', onClick: onReset } : undefined}
    />
  );
}
